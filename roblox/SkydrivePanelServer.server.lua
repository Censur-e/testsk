--!strict
--[[
    =======================================================================
    SKYDRIVE PANEL - SCRIPT SERVEUR ROBLOX (Luau)
    =======================================================================

    Emplacement : ServerScriptService > SkydrivePanelServer (Script)

    Pre-requis :
      1. Game Settings > Security :
         - HttpEnabled = TRUE           (requis pour HttpService)
         - LoadStringEnabled = TRUE     (requis pour /api/execute)
         - StudioAccessToApis = TRUE    (pour DataStore en Studio)
      2. Configurer les constantes ci-dessous (API_BASE, SERVER_KEY)
      3. Deployer le panel Next.js (ex: https://skydrive.vercel.app)

    Architecture :
      - Heartbeat toutes les 3s : envoie joueurs/logs, recoit commandes
      - Logs bufferises et envoyes en batch
      - Commandes executees sequentiellement puis ACK au serveur
      - DataStore : bans, economie et triggers persistes

    =======================================================================
]]

--===================== CONFIGURATION =====================
local API_BASE = "https://votre-panel.vercel.app"   -- URL de deploiement Next.js
local SERVER_KEY = "remplace-moi-par-une-cle-longue-et-secrete"
local HEARTBEAT_INTERVAL = 3                         -- secondes
local LOG_FLUSH_INTERVAL = 5                         -- secondes
local ECONOMY_SYNC_INTERVAL = 30                     -- secondes

--===================== SERVICES =====================
local HttpService      = game:GetService("HttpService")
local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local DataStoreService = game:GetService("DataStoreService")
local Lighting         = game:GetService("Lighting")
local TeleportService  = game:GetService("TeleportService")
local Chat             = game:GetService("Chat")
local Stats            = game:GetService("Stats")

--===================== DATASTORES =====================
local BansStore     = DataStoreService:GetDataStore("Skydrive_Bans_v1")
local EconomyStore  = DataStoreService:GetDataStore("Skydrive_Economy_v1")
local TriggersStore = DataStoreService:GetDataStore("Skydrive_Triggers_v1")

--===================== ETAT EN MEMOIRE =====================
local logBuffer: {{ type: string, text: string }} = {}
local mutedPlayers: {[number]: boolean} = {}
local frozenPlayers: {[number]: boolean} = {}
local serverStartedAt = tick()
local lastHeartbeatOk = true

--===================== HELPERS =====================

local function log(logType: string, text: string)
    print(string.format("[Skydrive][%s] %s", logType:upper(), text))
    table.insert(logBuffer, { type = logType, text = text })
    if #logBuffer > 200 then
        table.remove(logBuffer, 1)
    end
end

local function httpRequest(path: string, method: string, body: any?): (boolean, any?)
    local url = API_BASE .. path
    local headers = {
        ["Content-Type"] = "application/json",
        ["x-skydrive-key"] = SERVER_KEY,
    }

    local ok, result = pcall(function()
        if method == "GET" then
            return HttpService:GetAsync(url, false, headers)
        else
            local encoded = body and HttpService:JSONEncode(body) or "{}"
            return HttpService:RequestAsync({
                Url = url,
                Method = method,
                Headers = headers,
                Body = encoded,
            })
        end
    end)

    if not ok then
        return false, result
    end

    if method == "GET" then
        local decoded = HttpService:JSONDecode(result)
        return true, decoded
    end

    if typeof(result) == "table" and result.Success then
        local decoded = HttpService:JSONDecode(result.Body)
        return true, decoded
    end

    return false, result
end

local function getPlayerSnapshot(player: Player): any?
    local char = player.Character
    local humanoid = char and char:FindFirstChildOfClass("Humanoid")
    local root = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?

    local position = { x = 0, y = 0, z = 0 }
    if root then
        position = {
            x = math.floor(root.Position.X * 10) / 10,
            y = math.floor(root.Position.Y * 10) / 10,
            z = math.floor(root.Position.Z * 10) / 10,
        }
    end

    local health = 0
    local armor = 0
    if humanoid then
        health = math.floor((humanoid.Health / humanoid.MaxHealth) * 100)
    end

    -- Convention : leaderstats pour Money
    local money = 0
    local stats = player:FindFirstChild("leaderstats")
    if stats then
        local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
        if cash and cash:IsA("ValueBase") then
            money = (cash :: any).Value or 0
        end
    end

    -- Items equipes
    local items = {}
    if char then
        for _, tool in pairs(char:GetChildren()) do
            if tool:IsA("Tool") then
                table.insert(items, tool.Name)
            end
        end
    end

    -- Role base sur les groups (a adapter)
    local role = "Joueur"
    if player.UserId == game.CreatorId then
        role = "Admin"
    end

    return {
        id = tostring(player.UserId),
        username = player.Name,
        avatar = string.format("https://www.roblox.com/headshot-thumbnail/image?userId=%d&width=150", player.UserId),
        health = health,
        armor = armor,
        ping = math.floor(player:GetNetworkPing() * 1000),
        role = role,
        position = position,
        money = money,
        kills = 0,
        deaths = 0,
        playtime = string.format("%dm", math.floor((tick() - serverStartedAt) / 60)),
        team = player.Team and player.Team.Name or "Neutre",
        items = items,
        lastSeen = 0, -- injecte cote API
    }
end

--===================== EXECUTEURS DE COMMANDES =====================

local commandHandlers: {[string]: (any) -> (boolean, string?)} = {}

commandHandlers.kick = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player then return false, "Joueur introuvable" end
    local reason = cmd.payload and cmd.payload.reason or "Kick admin"
    player:Kick(tostring(reason))
    log("info", string.format("Kick %s : %s", player.Name, reason))
    return true
end

commandHandlers.ban = function(cmd)
    local userId = tonumber(cmd.targetId)
    if not userId then return false, "UserId invalide" end

    local reason = cmd.payload and cmd.payload.reason or "Banni"
    local expiresAt = cmd.payload and cmd.payload.expiresAt

    -- Persiste dans le DataStore
    local ok, err = pcall(function()
        BansStore:SetAsync(tostring(userId), {
            reason = reason,
            bannedAt = os.time(),
            expiresAt = expiresAt,
        })
    end)
    if not ok then
        return false, "DataStore: " .. tostring(err)
    end

    -- Kick si en ligne
    local player = Players:GetPlayerByUserId(userId)
    if player then
        player:Kick("Banni : " .. tostring(reason))
    end

    log("warning", string.format("Ban %d : %s", userId, reason))
    return true
end

commandHandlers.unban = function(cmd)
    local userId = tonumber(cmd.targetId)
    if not userId then return false, "UserId invalide" end
    local ok, err = pcall(function()
        BansStore:RemoveAsync(tostring(userId))
    end)
    if not ok then return false, tostring(err) end
    log("success", string.format("Unban %d", userId))
    return true
end

commandHandlers.warn = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player then return false, "Joueur introuvable" end
    local msg = cmd.payload and cmd.payload.message or "Avertissement de la moderation"
    -- Envoie un message prive via ReplicatedStorage ou StarterGui selon votre architecture
    Chat:Chat(player.Character or player, "[AVERTISSEMENT] " .. tostring(msg), Enum.ChatColor.Red)
    log("warning", string.format("Warn %s", player.Name))
    return true
end

commandHandlers.mute = function(cmd)
    local userId = tonumber(cmd.targetId)
    if not userId then return false, "UserId invalide" end
    mutedPlayers[userId] = true
    log("info", string.format("Mute %d", userId))
    return true
end

commandHandlers.unmute = function(cmd)
    local userId = tonumber(cmd.targetId)
    if not userId then return false, "UserId invalide" end
    mutedPlayers[userId] = nil
    return true
end

commandHandlers.freeze = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player or not player.Character then return false, "Joueur non trouve" end
    local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 0
        humanoid.JumpPower = 0
        frozenPlayers[player.UserId] = true
    end
    return true
end

commandHandlers.unfreeze = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player or not player.Character then return false, "Joueur non trouve" end
    local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 16
        humanoid.JumpPower = 50
        frozenPlayers[player.UserId] = nil
    end
    return true
end

commandHandlers.heal = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player or not player.Character then return false, "Joueur non trouve" end
    local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then humanoid.Health = humanoid.MaxHealth end
    return true
end

commandHandlers.kill = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player or not player.Character then return false, "Joueur non trouve" end
    local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid then humanoid.Health = 0 end
    return true
end

commandHandlers.teleport_to_me = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    local admin = cmd.payload and Players:GetPlayerByUserId(tonumber(cmd.payload.adminId) or 0)
    if not player or not player.Character then return false, "Cible non trouvee" end
    if not admin or not admin.Character then
        -- Fallback : teleporte au spawn
        local root = player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
        if root then root.CFrame = CFrame.new(0, 50, 0) end
        return true
    end
    local adminRoot = admin.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
    local root = player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
    if adminRoot and root then
        root.CFrame = adminRoot.CFrame + Vector3.new(2, 0, 0)
    end
    return true
end

commandHandlers.teleport = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    local p = cmd.payload
    if not player or not player.Character or not p then return false, "Donnees invalides" end
    local root = player.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
    if root then
        root.CFrame = CFrame.new(p.x or 0, p.y or 50, p.z or 0)
    end
    return true
end

commandHandlers.force_chat = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player then return false, "Joueur introuvable" end
    local msg = cmd.payload and cmd.payload.message or "..."
    Chat:Chat(player.Character or player, tostring(msg))
    return true
end

commandHandlers.wipe_inventory = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player then return false, "Joueur introuvable" end
    local backpack = player:FindFirstChildOfClass("Backpack")
    if backpack then backpack:ClearAllChildren() end
    if player.Character then
        for _, tool in pairs(player.Character:GetChildren()) do
            if tool:IsA("Tool") then tool:Destroy() end
        end
    end
    return true
end

commandHandlers.clone = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player or not player.Character then return false, "Joueur non trouve" end
    local clone = player.Character:Clone()
    clone.Name = player.Name .. "_clone"
    clone.Parent = workspace
    return true
end

commandHandlers.set_team = function(cmd)
    local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
    if not player then return false, "Joueur introuvable" end
    local teamName = cmd.payload and cmd.payload.team
    if teamName == "random" then
        local teams = game.Teams:GetChildren()
        if #teams > 0 then
            player.Team = teams[math.random(#teams)]
        end
    elseif teamName then
        local team = game.Teams:FindFirstChild(tostring(teamName))
        if team then player.Team = team end
    end
    return true
end

commandHandlers.set_money = function(cmd)
    local payload = cmd.payload or {}
    local delta = tonumber(payload.delta) or 0
    local multiplier = tonumber(payload.multiplier)

    local function applyTo(player)
        local stats = player:FindFirstChild("leaderstats")
        if not stats then return end
        local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
        if not cash then return end
        if multiplier then
            (cash :: any).Value = math.floor((cash :: any).Value * multiplier)
        else
            (cash :: any).Value = (cash :: any).Value + delta
        end
    end

    if cmd.targetId == "*" then
        for _, p in pairs(Players:GetPlayers()) do applyTo(p) end
    else
        local player = Players:GetPlayerByUserId(tonumber(cmd.targetId) or 0)
        if player then applyTo(player) end
    end
    return true
end

commandHandlers.set_world = function(cmd)
    local w = cmd.payload
    if not w then return false, "Payload manquant" end

    if w.gravity then workspace.Gravity = tonumber(w.gravity) or workspace.Gravity end
    if w.timeOfDay then Lighting.ClockTime = tonumber(w.timeOfDay) or Lighting.ClockTime end

    -- Applique vitesse/saut a tous les joueurs
    if w.walkSpeed or w.jumpHeight then
        for _, player in pairs(Players:GetPlayers()) do
            if player.Character then
                local h = player.Character:FindFirstChildOfClass("Humanoid")
                if h then
                    if w.walkSpeed and not frozenPlayers[player.UserId] then
                        h.WalkSpeed = tonumber(w.walkSpeed) or 16
                    end
                    if w.jumpHeight and not frozenPlayers[player.UserId] then
                        h.JumpHeight = tonumber(w.jumpHeight) or 7.2
                    end
                end
            end
        end
    end

    -- Meteo : a adapter selon votre systeme (ex: effets d'atmosphere)
    if w.weather then
        log("info", "Meteo changee en : " .. tostring(w.weather))
        -- Exemple : Lighting:SetAttribute("Weather", w.weather)
    end

    return true
end

commandHandlers.broadcast = function(cmd)
    local msg = cmd.payload and cmd.payload.message
    if msg then
        for _, p in pairs(Players:GetPlayers()) do
            Chat:Chat(p.Character or p, "[ADMIN] " .. tostring(msg), Enum.ChatColor.Blue)
        end
        log("chat", "[ADMIN] " .. tostring(msg))
    end
    return true
end

commandHandlers.execute_lua = function(cmd)
    local code = cmd.payload and cmd.payload.code
    if type(code) ~= "string" then return false, "Code manquant" end

    -- loadstring requiert LoadStringEnabled = TRUE dans Game Settings
    local fn, compileErr = loadstring(code)
    if not fn then
        log("error", "Compile : " .. tostring(compileErr))
        return false, "Compile: " .. tostring(compileErr)
    end

    local ok, runtimeErr = pcall(fn)
    if not ok then
        log("error", "Runtime : " .. tostring(runtimeErr))
        return false, "Runtime: " .. tostring(runtimeErr)
    end

    log("success", "Script Lua execute avec succes")
    return true
end

commandHandlers.spectate = function(_cmd)
    -- Cote client uniquement - simple acknowledgement ici
    log("info", "Spectate demande (traitement client)")
    return true
end

--===================== BOUCLE HEARTBEAT =====================

local function doHeartbeat()
    local players = {}
    for _, p in pairs(Players:GetPlayers()) do
        local snap = getPlayerSnapshot(p)
        if snap then table.insert(players, snap) end
    end

    local logsToSend = {}
    for _, entry in ipairs(logBuffer) do
        table.insert(logsToSend, entry)
    end
    logBuffer = {}

    local body = {
        serverId = game.GameId and tostring(game.GameId) or "0",
        jobId = game.JobId,
        placeId = tostring(game.PlaceId),
        uptime = math.floor(tick() - serverStartedAt),
        maxPlayers = Players.MaxPlayers,
        cpuUsage = math.floor((Stats and Stats:GetTotalMemoryUsageMb() or 0)) % 100,
        memoryMB = math.floor(Stats and Stats:GetTotalMemoryUsageMb() or 0),
        players = players,
        logs = logsToSend,
    }

    local ok, response = httpRequest("/api/heartbeat", "POST", body)
    if not ok then
        if lastHeartbeatOk then
            warn("[Skydrive] Heartbeat echec : " .. tostring(response))
        end
        lastHeartbeatOk = false
        return
    end
    lastHeartbeatOk = true

    -- Traiter les commandes recues
    local commands = response and response.commands or {}
    if #commands > 0 then
        local acks = {}
        for _, cmd in ipairs(commands) do
            local handler = commandHandlers[cmd.kind]
            if handler then
                local success, err = pcall(handler, cmd)
                local finalSuccess = success and (err ~= false)
                table.insert(acks, {
                    id = cmd.id,
                    success = finalSuccess,
                    error = not finalSuccess and tostring(err) or nil,
                })
            else
                table.insert(acks, {
                    id = cmd.id,
                    success = false,
                    error = "Handler inconnu: " .. tostring(cmd.kind),
                })
            end
        end
        -- Acknowledge toutes les commandes en un seul appel
        httpRequest("/api/commands/ack", "POST", { acks = acks })
    end
end

--===================== DATASTORE SYNC =====================

local function loadBanFromStore(userId: number): boolean
    local ok, data = pcall(function()
        return BansStore:GetAsync(tostring(userId))
    end)
    if ok and data then
        if data.expiresAt and data.expiresAt < (os.time() * 1000) then
            pcall(function() BansStore:RemoveAsync(tostring(userId)) end)
            return false
        end
        return true
    end
    return false
end

local function syncEconomyToPanel()
    local entries = {}
    for _, player in pairs(Players:GetPlayers()) do
        local stats = player:FindFirstChild("leaderstats")
        if stats then
            local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
            if cash then
                table.insert(entries, {
                    userId = tostring(player.UserId),
                    username = player.Name,
                    balance = (cash :: any).Value,
                    totalEarned = player:GetAttribute("TotalEarned") or (cash :: any).Value,
                    totalSpent = player:GetAttribute("TotalSpent") or 0,
                    updatedAt = 0,
                })
            end
        end
    end
    if #entries > 0 then
        httpRequest("/api/economy", "POST", { bulk = entries })
    end
end

--===================== EVENEMENTS JOUEURS =====================

Players.PlayerAdded:Connect(function(player)
    -- Verifie si le joueur est ban
    if loadBanFromStore(player.UserId) then
        player:Kick("Vous etes banni de ce serveur.")
        return
    end

    log("success", player.Name .. " s'est connecte")

    -- Charge l'economie du joueur depuis le DataStore
    pcall(function()
        local data = EconomyStore:GetAsync(tostring(player.UserId))
        if data then
            -- Attend que leaderstats soit cree par votre systeme, puis applique
            task.wait(1)
            local stats = player:FindFirstChild("leaderstats")
            if stats then
                local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
                if cash then (cash :: any).Value = data.balance or 0 end
            end
        end
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    log("info", player.Name .. " s'est deconnecte")

    -- Sauvegarde l'economie du joueur
    pcall(function()
        local stats = player:FindFirstChild("leaderstats")
        if stats then
            local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
            if cash then
                EconomyStore:SetAsync(tostring(player.UserId), {
                    balance = (cash :: any).Value,
                    updatedAt = os.time(),
                })
            end
        end
    end)

    mutedPlayers[player.UserId] = nil
    frozenPlayers[player.UserId] = nil
end)

-- Filtre le chat pour les joueurs mute + stream vers le panel
Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(message)
        if mutedPlayers[player.UserId] then
            -- Normalement utiliser le chat system "modern" avec TextChatService
            log("warning", player.Name .. " (mute) a tente : " .. message)
            return
        end
        log("chat", string.format("[%s] %s", player.Name, message))
    end)
end)

--===================== DEMARRAGE =====================

log("info", "=== Skydrive Panel Server demarre ===")
log("info", "API : " .. API_BASE)

-- Heartbeat loop
task.spawn(function()
    while true do
        local ok, err = pcall(doHeartbeat)
        if not ok then warn("[Skydrive] Heartbeat crash : " .. tostring(err)) end
        task.wait(HEARTBEAT_INTERVAL)
    end
end)

-- Economy sync loop
task.spawn(function()
    while true do
        task.wait(ECONOMY_SYNC_INTERVAL)
        pcall(syncEconomyToPanel)
    end
end)

-- Sauvegarde l'economie a la fermeture du serveur
game:BindToClose(function()
    for _, player in pairs(Players:GetPlayers()) do
        local stats = player:FindFirstChild("leaderstats")
        if stats then
            local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
            if cash then
                pcall(function()
                    EconomyStore:SetAsync(tostring(player.UserId), {
                        balance = (cash :: any).Value,
                        updatedAt = os.time(),
                    })
                end)
            end
        end
    end
    -- Dernier heartbeat
    pcall(doHeartbeat)
end)
