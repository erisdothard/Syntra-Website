"""Tiny bpy helpers shared by the fluid scripts (Blender 5 layered actions)."""
import bpy


def iter_fcurves(action):
    if action is None:
        return
    if hasattr(action, 'fcurves') and not getattr(action, 'is_action_layered', False):
        yield from action.fcurves
        return
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                yield from cb.fcurves


def linearize(id_data):
    """Set every keyframe on `id_data` (object, node tree, light...) to LINEAR."""
    ad = getattr(id_data, 'animation_data', None)
    if ad is None or ad.action is None:
        return 0
    n = 0
    for fc in iter_fcurves(ad.action):
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
            n += 1
    return n


def unlink_all(ob):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)


def get_or_make_collection(scene, name):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
    if coll.name not in scene.collection.children:
        scene.collection.children.link(coll)
    return coll
