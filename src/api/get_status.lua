-- GET /starter/status — module identity plus the number of persisted log
-- entries. Authn is enforced by the router (token_auth + endpoint_firewall);
-- the actor check keeps direct invocations honest.
local http = require("http")
local security = require("security")
local repo = require("repo")

local function handler()
    local res = http.response()
    local req = http.request()
    if not res or not req then return nil, "no http context" end
    res:set_content_type(http.CONTENT.JSON)

    local actor = security.actor()
    if not actor then
        res:set_status(http.STATUS.UNAUTHORIZED)
        res:write_json({ success = false, error = "authentication required" })
        return
    end

    local count, err = repo.count()
    if err then
        res:set_status(http.STATUS.INTERNAL_ERROR)
        res:write_json({ success = false, error = "log entry count: " .. tostring(err) })
        return
    end

    res:set_status(http.STATUS.OK)
    res:write_json({ success = true, module = "acme/starter", count = count })
end

return { handler = handler }
