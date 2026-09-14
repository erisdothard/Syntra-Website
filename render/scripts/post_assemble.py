"""Final assembly pass, run on launch_final.blend after add_plume.

Turns shadow casting off on the Mantaflow smoke domains. Small plume lights
shining through the lumpy cloud cast a mottled shadow on the ground that reads
as gravel; the reference cloud (Apollo 17, S72-55070) is lit through, not
shadowing. Verified on frame 104: mottling gone, cloud brighter, +30 % time.

    python3 render/scripts/run_blender.py --blend render/cache/launch_final.blend render/scripts/post_assemble.py
"""
import bpy

n = 0
for o in bpy.data.objects:
    is_domain = o.type == "MESH" and any(m.type == "FLUID" and m.fluid_type == "DOMAIN" for m in o.modifiers)
    if o.name.startswith("FLUID_") and is_domain:
        o.visible_shadow = False
        n += 1
bpy.ops.wm.save_mainfile()
print(f"[post_assemble] shadow casting off on {n} smoke domains; saved {bpy.data.filepath}")
