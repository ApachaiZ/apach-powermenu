import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const Model = require("../Model.js")

test("connector names and modelines are restricted before hyprctl eval", () => {
  assert.equal(Model.safeName("HDMI-A-1"), "HDMI-A-1")
  assert.equal(Model.safeName("eDP-1"), "eDP-1")
  assert.equal(Model.safeName('HDMI-A-1", position = "top'), "")
  assert.equal(Model.safeName("../etc/passwd"), "")
  assert.equal(Model.safeName(""), "")

  assert.equal(Model.safeMode("3440x1440@120.00"), "3440x1440@120.00")
  assert.equal(Model.safeMode("1920x1080@60"), "1920x1080@60")
  assert.equal(Model.safeMode('3440x1440@60", position = "top'), "")
  assert.equal(Model.safeMode("wide"), "")
  assert.equal(Model.safeMode(""), "")
})

test("monitor JSON keeps only plain values", () => {
  const [m] = Model.parseMonitors(JSON.stringify([{
    name: "HDMI-A-1", disabled: false, focused: true, transform: 1,
    scale: 1.25, width: 3440, height: 1440, refreshRate: 120,
    availableModes: ["3440x1440@120.00Hz", "2560x1080@60.00Hz", "3440x1440@120.00Hz"]
  }]))
  assert.equal(m.name, "HDMI-A-1")
  assert.equal(m.enabled, true)
  assert.equal(m.focused, true)
  assert.equal(m.transform, 1)
  assert.equal(m.currentMode, "3440x1440@120")
  assert.equal(m.modes.length, 2)
  assert.equal(m.modes[0].value, "3440x1440@120.00")
  assert.equal(Model.safeMode(m.modes[0].value), m.modes[0].value)
})

test("malformed monitor JSON is ignored", () => {
  assert.deepEqual(Model.parseMonitors("not json"), [])
  assert.deepEqual(Model.parseMonitors(JSON.stringify({ name: "x" })), [])
})

test("power profiles parse tab-separated active states", () => {
  const profiles = Model.parseProfiles("power-saver\t0\nbalanced\t1\nperformance\t0\n")
  assert.deepEqual(profiles.map((p) => p.name), ["power-saver", "balanced", "performance"])
  assert.equal(profiles[1].active, true)
  assert.equal(profiles[0].active, false)
  assert.deepEqual(Model.parseProfiles(""), [])
})

test("bar placement reads the shell layout shape", () => {
  const raw = JSON.stringify({
    bar: { layout: {
      left: ["icons", "omarchy.menu"],
      center: [{ id: "apach.powermenu" }],
      right: []
    } }
  })
  const placement = Model.parseBarPlacement(raw, "apach.powermenu")
  assert.equal(placement.section, "center")
  assert.equal(placement.index, 0)
  assert.deepEqual(placement.sizes, { left: 2, center: 1, right: 0 })
  assert.deepEqual(Model.parseBarPlacement("not json", "apach.powermenu").section, "")
})

test("uptime parsing is bounded", () => {
  assert.equal(Model.parseUptime("123.45 12.34\n"), 123.45)
  assert.equal(Model.parseUptime(""), 0)
  assert.equal(Model.parseUptime("garbage"), 0)
  assert.equal(Model.formatUptime(0), "0m")
  assert.equal(Model.formatUptime(300000), "3d 11h")
  assert.equal(Model.formatUptime(74100), "20h 35m")
})
