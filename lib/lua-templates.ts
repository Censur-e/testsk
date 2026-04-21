// Templates Lua fournis a l'utilisateur lorsqu'il cree une nouvelle commande.
// Ils expliquent aussi les variables disponibles dans le sandbox Roblox.

export const LUA_HEADER_COMMENT = `-- =======================================================================
-- COMMANDE PERSONNALISEE - SKYDRIVE PANEL
-- =======================================================================
--
-- Ce code Lua sera execute cote serveur Roblox quand tu cliques sur ta commande.
--
-- VARIABLES DISPONIBLES DANS CE SANDBOX :
--   player     : Player Roblox cible (nil pour une commande Monde)
--   inputs     : table avec les valeurs saisies dans le panel
--                Ex: si tu as ajoute un champ "key=message", utilise inputs.message
--                Les booleens sont renvoyes sous forme "true"/"false" (string).
--   log(type, text) : envoie un log dans la console du panel
--                type = "info" | "success" | "warning" | "error" | "chat"
--
-- SERVICES / GLOBALS AUTORISES :
--   game, workspace, script, task, wait, tick, os, math, string, table
--   Players, Lighting, Chat, HttpService, TeleportService, Stats
--   CFrame, Vector3, Enum, Color3, Instance
--   pcall, ipairs, pairs, tonumber, tostring, typeof, print, warn
--
-- RENVOIE :
--   Rien pour succes, ou error("message") pour signaler une erreur au panel.
-- =======================================================================

`

export const LUA_TEMPLATE_PLAYER = `${LUA_HEADER_COMMENT}-- Exemple : booste la vitesse du joueur
if not player or not player.Character then
    error("Joueur introuvable")
end

local humanoid = player.Character:FindFirstChildOfClass("Humanoid")
if not humanoid then
    error("Humanoid manquant")
end

local speed = tonumber(inputs.speed) or 16
humanoid.WalkSpeed = speed
log("success", string.format("%s court maintenant a %d studs/s", player.Name, speed))
`

export const LUA_TEMPLATE_WORLD = `${LUA_HEADER_COMMENT}-- Exemple : fait pleuvoir des pieces pour tous les joueurs
local Players = game:GetService("Players")
local amount = tonumber(inputs.amount) or 100

for _, p in ipairs(Players:GetPlayers()) do
    local stats = p:FindFirstChild("leaderstats")
    if stats then
        local cash = stats:FindFirstChild("Cash") or stats:FindFirstChild("Money")
        if cash then
            cash.Value = cash.Value + amount
        end
    end
end

log("success", string.format("%d pieces distribuees a tout le monde", amount))
`
