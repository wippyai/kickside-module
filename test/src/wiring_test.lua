-- Registry-shape test for the HTTP and UI surfaces. The harness does not call
-- its router or gateway, so the endpoint and web component are verified as
-- registry wiring: every entry exists and the cross-references line up.
local test = require("test")
local registry = require("registry")

local NS = "acme.starter"
local HANDLER_ID = "acme.starter.api:get_status"
local ENDPOINT_ID = "acme.starter.api:get_status.endpoint"
local VIEW_ID = "acme.starter:starter_view"
local NAV_ID = "acme.starter:nav_item"
local STATIC_ID = "acme.starter:ui_static"
local FS_ID = "acme.starter:ui_fs"
local POLICY_ID = "acme.starter.security:starter_endpoint_access"

local function get(id)
    local entry, err = registry.get(id)
    test.is_nil(err)
    test.not_nil(entry, id .. " is missing")
    return entry
end

local function meta_of(entry)
    if type(entry.meta) == "table" then return entry.meta end
    if type(entry.data) == "table" and type(entry.data.meta) == "table" then return entry.data.meta end
    return {}
end

local function data_of(entry)
    if type(entry.data) == "table" then return entry.data end
    return entry
end

-- Entry references are written relative or namespace-qualified; compare fully
-- qualified.
local function qualify(ref, ns)
    if type(ref) ~= "string" then return ref end
    if ref:find(":", 1, true) then return ref end
    return ns .. ":" .. ref
end

local function define_tests()
    test.describe("acme.starter surface wiring", function()
        test.it("pairs the status endpoint with its handler on the router token", function()
            get(HANDLER_ID)
            local ep = data_of(get(ENDPOINT_ID))
            test.eq(qualify(ep.func, "acme.starter.api"), HANDLER_ID)
            test.eq(ep.method, "GET")
            test.eq(ep.path, "/starter/status")
            test.eq(meta_of(get(ENDPOINT_ID)).router, "app:api")
        end)

        test.it("declares a view served by the module's own static mount", function()
            local view = meta_of(get(VIEW_ID))
            test.eq(view.type, "view.component")
            test.eq(view.tag_name, "acme-starter")
            test.eq(view.entry_point, "index.js")
            test.eq(view.announced, true)
            test.eq(view.auto_register, true)

            local static = get(STATIC_ID)
            test.eq(data_of(static).path, "/" .. view.base_path)
            test.eq(qualify(data_of(static).fs, NS), FS_ID)
            get(FS_ID)
        end)

        test.it("mounts the view in the app nav by tag", function()
            local nav = meta_of(get(NAV_ID))
            test.eq(nav.type, "ui.nav_item")
            test.eq(nav.path, "/starter")
            test.eq(nav.render, "component")
            test.eq(nav.component_tag, meta_of(get(VIEW_ID)).tag_name)
        end)

        test.it("gates the api namespace behind the injectable access policy", function()
            local policy = data_of(get(POLICY_ID))
            local resources = policy.policy and policy.policy.resources
            test.not_nil(resources, "policy must list resources")
            if type(resources) == "string" then resources = { resources } end
            local covered = false
            for _, r in ipairs(resources) do
                if r == "acme.starter.api:*" then covered = true end
            end
            test.is_true(covered, "policy must cover acme.starter.api:*")
        end)
    end)
end

local run_cases = test.run_cases(define_tests)
return { run = function(options) return run_cases(options) end }
