"""Exact port of src/lib/launchTimeline.ts (mapProgress + PHASES) plus the
site → Blender coordinate conversion from render/SPEC.md.

Site (x, y, z) → Blender (x*4.6, -z*4.6, y*4.6).  1 site unit = 4.6 m.
Frame f (1-based, 240 frames) → progress p = (f - 1) / 239.
"""
import math

FRAME_COUNT = 240
SITE_UNIT = 4.6            # metres per site unit
ENGINE_PLANE_Z = 13.3      # m, engine exit plane when on the pad
LIFT_UNITS = 95            # site units at lift = 1


def clamp01(v):
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def smoothstep(a, b, x):
    t = clamp01((x - a) / (b - a))
    return t * t * (3 - 2 * t)


def ease_out_expo(t):
    return 1.0 if t >= 1 else 1 - math.pow(2, -10 * t)


def ease_in_cubic(t):
    return t * t * t


def ease_in_out_cubic(t):
    return 4 * t * t * t if t < 0.5 else 1 - math.pow(-2 * t + 2, 3) / 2


def lerp(a, b, t):
    return a + (b - a) * t


PHASES = dict(
    heroEnd=0.06,
    act1Start=0.06, ventPeak=0.28, act1End=0.34,
    act2Start=0.34, ignitionStart=0.36, ignitionFull=0.44,
    shockStart=0.40, shockEnd=0.52, releaseStart=0.46, releaseEnd=0.58,
    act2End=0.66,
    act3Start=0.66, thrustFull=0.76, liftStart=0.70, liftEnd=0.97, act3End=1.0,
)


def act_at(p):
    if p < PHASES["act1Start"]:
        return 0
    if p < PHASES["act2Start"]:
        return 1
    if p < PHASES["act3Start"]:
        return 2
    return 3


def map_progress(p, narrow=False):
    """Returns a dict mirroring ScrollState (site units for camera fields)."""
    P = PHASES
    p = clamp01(p)
    out = {"progress": p, "act": act_at(p)}

    pressure = smoothstep(P["act1Start"], P["act1End"], p)
    out["pressure"] = pressure
    vent_up = smoothstep(P["act1Start"], P["ventPeak"], p)
    vent_down = 1 - smoothstep(P["ignitionStart"], P["ignitionFull"], p)
    out["vent"] = vent_up * vent_down

    ig = ease_out_expo(smoothstep(P["ignitionStart"], P["ignitionFull"], p))
    out["ignition"] = ig

    shock_t = clamp01((p - P["shockStart"]) / (P["shockEnd"] - P["shockStart"]))
    out["shock"] = ease_out_expo(shock_t) if (P["shockStart"] <= p < P["shockEnd"]) else 0.0

    out["release"] = ease_in_out_cubic(smoothstep(P["releaseStart"], P["releaseEnd"], p))

    out["thrust"] = smoothstep(P["act3Start"], P["thrustFull"], p)
    lift_t = clamp01((p - P["liftStart"]) / (P["liftEnd"] - P["liftStart"]))
    out["lift"] = ease_in_cubic(lift_t)
    out["altitude"] = smoothstep(P["liftStart"] + 0.08, P["liftEnd"], p)

    tremor = pressure * 0.12
    slam = (1 - smoothstep(P["ignitionStart"], P["shockEnd"] + 0.05, p)) * ig * 1.0
    rumble = ig * 0.35 * (1 - out["altitude"] * 0.8)
    out["shake"] = max(tremor, slam, rumble)

    spike = ig * (1 - smoothstep(P["ignitionFull"], P["shockEnd"], p))
    out["exposure"] = 1 + spike * 0.9 + ig * 0.15

    m = 1.35 if narrow else 1.0
    c_hero = dict(x=-7, y=11, z=46 * m, look=12.5)
    c_act1 = dict(x=-6.5, y=3.4, z=12.5 * m, look=3.6)
    c_act2 = dict(x=-12, y=11, z=44 * m, look=11)  # pulled back out of the pad cloud (site was z=33, y=9.5, look=10)
    c_act3 = dict(x=6, y=15, z=42 * m, look=12)  # render: look at the lower body, not the nose (site was 23)

    t1 = smoothstep(0, P["act1Start"] + 0.1, p)
    t2 = smoothstep(P["act1End"] - 0.04, P["ignitionFull"] + 0.04, p)
    t3 = smoothstep(P["act2End"] - 0.06, P["act3Start"] + 0.1, p)

    x = lerp(c_hero["x"], c_act1["x"], t1)
    y = lerp(c_hero["y"], c_act1["y"], t1)
    z = lerp(c_hero["z"], c_act1["z"], t1)
    look = lerp(c_hero["look"], c_act1["look"], t1)

    x = lerp(x, c_act2["x"], t2)
    y = lerp(y, c_act2["y"], t2)
    z = lerp(z, c_act2["z"], t2)
    look = lerp(look, c_act2["look"], t2)

    x = lerp(x, c_act3["x"], t3)
    y = lerp(y, c_act3["y"], t3)
    z = lerp(z, c_act3["z"], t3)
    look = lerp(look, c_act3["look"], t3)

    # Render camera diverges from the site here: track the vehicle 1:1 so the
    # engines and plume stay in frame, rise more slowly than it, and pull back
    # as it climbs so the whole plume fits (site: climb = lift*60, y += 0.55*climb).
    climb = out["lift"] * 95
    look += climb
    y += climb * 0.6
    z += out["lift"] * 60

    out["cameraX"] = x
    out["cameraY"] = y
    out["cameraZ"] = z
    out["lookY"] = look
    out["roll"] = (t2 - t3) * 0.03
    # Site Rocket.tsx surface state (frost builds with venting, boils off at ignition)
    out["frost"] = max(0.0, out["vent"] * 0.9 + pressure * 0.35 - ig * 1.4)
    return out


def frame_progress(f):
    return (f - 1) / (FRAME_COUNT - 1)


def site_to_blender(x, y, z):
    return (x * SITE_UNIT, -z * SITE_UNIT, y * SITE_UNIT)


def frame_state(f, narrow=False):
    """Timeline state for a Blender frame, with Blender-space camera data added."""
    s = map_progress(frame_progress(f), narrow)
    s["frame"] = f
    s["cam"] = site_to_blender(s["cameraX"], s["cameraY"], s["cameraZ"])
    s["look"] = (0.0, 0.0, s["lookY"] * SITE_UNIT)
    s["vehicle_z"] = ENGINE_PLANE_Z + s["lift"] * LIFT_UNITS * SITE_UNIT
    return s


def progress_to_frame(p):
    return int(round(p * (FRAME_COUNT - 1))) + 1


if __name__ == "__main__":
    for p in (0, 0.22, 0.43, 0.50, 0.78, 0.95, 1.0):
        s = frame_state(progress_to_frame(p))
        print(f"p={p:.2f} f={s['frame']:3d} cam={tuple(round(v,1) for v in s['cam'])} "
              f"look={round(s['look'][2],1)} vz={s['vehicle_z']:.1f} lift={s['lift']:.3f} "
              f"alt={s['altitude']:.3f} ig={s['ignition']:.3f} vent={s['vent']:.3f} frost={s['frost']:.3f}")
