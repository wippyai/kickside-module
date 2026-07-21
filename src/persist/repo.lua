-- Log entry rows. One row per acknowledged write.
local sql = require("sql")
local env = require("env")
local uuid = require("uuid")

-- Code default with env override for the module-owned db resource id.
local DB_ID = env.get("ACME_STARTER_DB_ID") or "app:db"

local repo = {}

local function with_db(fn)
    local db, err = sql.get(DB_ID)
    if err or not db then return nil, err or ("database unavailable: " .. DB_ID) end
    local result, rerr = fn(db)
    db:release()
    return result, rerr
end

-- Insert one log entry. Returns the generated row id.
function repo.insert(label, content)
    return with_db(function(db)
        local id = uuid.v7()
        local _, err = db:execute(
            "INSERT INTO acme_starter_log_entries (id, label, content) VALUES ($1, $2, $3)",
            { id, label, content })
        if err then return nil, err end
        return id
    end)
end

-- Number of log entries written so far.
function repo.count()
    return with_db(function(db)
        local rows, err = db:query("SELECT COUNT(*) AS n FROM acme_starter_log_entries", {})
        if err then return nil, err end
        local row = rows and rows[1]
        return tonumber(row and (row.n or row["COUNT(*)"])) or 0
    end)
end

return repo
