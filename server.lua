-- ppr-dev server side for loading screen handover

AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    local src = source
    deferrals.defer()
    Wait(0)

    -- get current player count and max slots
    local playerCount = #GetPlayers()
    local maxPlayers = GetConvarInt('sv_maxclients', 64)

    -- send data to the loading screen nui
    deferrals.handover({
        playerName = name,
        playerCount = playerCount,
        maxPlayers = maxPlayers
    })

    deferrals.done()
end)
