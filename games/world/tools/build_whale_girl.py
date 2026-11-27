"""Blender 5.3 headless build: original stylized DeepSeek whale-girl fan character."""
import bpy, math
from mathutils import Vector, Euler

ROOT = "/Users/lu/work/fab/LiveRefu/games/world"
OUT = ROOT + "/web/models/deepseek-whale-girl.glb"
PREVIEW = ROOT + "/docs/shots/whale-girl-preview.png"

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for b in list(coll):
        if b.users == 0:
            coll.remove(b)

def material(name, rgb, rough=.5, metal=0.0, emit=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, alpha)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*emit, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    return m

SKIN = material('MAT_Skin', (0.82, 0.55, 0.42), .5)
SKIN2 = material('MAT_SkinShade', (0.83, 0.61, 0.54), .55)
HAIR_D = material('MAT_Hair_Deep', (0.012, 0.055, 0.13), .35)
HAIR_M = material('MAT_Hair_Mid', (0.025, 0.18, 0.33), .32)
HAIR_T = material('MAT_Hair_Tip', (0.12, 0.58, 0.66), .22, emit=(0.2, 0.85, 0.85), strength=.35)
DRESS = material('MAT_Dress', (0.018, 0.055, 0.14), .5, .08)
DRESS_L = material('MAT_DressLight', (0.04, 0.13, 0.25), .46, .1)
WHITE = material('MAT_White', (0.95, 0.93, 0.86), .62)
WHITE_S = material('MAT_WhiteShade', (0.83, 0.82, 0.76), .65)
GOLD = material('MAT_Gold', (0.79, 0.49, 0.14), .22, .9)
FIN = material('MAT_Fin', (0.16, 0.70, 0.74), .14, emit=(0.15, 0.9, 0.88), strength=1.1, alpha=.82)
FIN_D = material('MAT_FinDark', (0.04, 0.28, 0.37), .24, .1, emit=(0.02, 0.18, 0.24), strength=.2)
EYE_W = material('MAT_EyeWhite', (0.98, 0.98, 0.95), .22)
EYE_D = material('MAT_EyeDeep', (0.02, 0.12, 0.24), .22, emit=(0.01, 0.12, 0.2), strength=.3)
EYE_B = material('MAT_EyeBlue', (0.05, 0.36, 0.55), .25, emit=(0.02, 0.18, 0.3), strength=.2)
EYE_H = material('MAT_EyeHigh', (0.8, 1.0, 0.96), .15, emit=(0.7, 1.0, 0.95), strength=1.5)
DARK = material('MAT_Lash', (0.01, 0.02, 0.035), .55)
BLUSH = material('MAT_Blush', (0.9, 0.45, 0.43), .6, alpha=.35)
PEARL = material('MAT_Pearl', (0.9, 0.92, 0.86), .25, .2)

def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True

def sphere(name, loc, scale, mat, seg=48, ring=24, rot=(0,0,0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=1, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.rotation_euler=Euler(rot); o.data.materials.append(mat); smooth(o); return o

def cube(name, loc, scale, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.rotation_euler=Euler(rot); o.data.materials.append(mat); return o

def cyl(name, loc, r, depth, mat, vertices=32, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.rotation_euler=Euler(rot); o.data.materials.append(mat); smooth(o); return o

def between(name, p1, p2, r, mat, vertices=24):
    p1=Vector(p1); p2=Vector(p2); mid=(p1+p2)/2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=(p2-p1).length, location=mid)
    o=bpy.context.object; o.name=name
    o.rotation_euler=(p2-p1).to_track_quat('Z','Y').to_euler()
    o.data.materials.append(mat); smooth(o); return o

def cone(name, loc, r1, r2, depth, mat, vertices=64):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat); smooth(o); return o

def torus(name, loc, major, minor, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64, minor_segments=12, location=loc)
    o=bpy.context.object; o.name=name; o.rotation_euler=Euler(rot); o.data.materials.append(mat); smooth(o); return o

def curve(name, pts, bevel, mat, radii=None):
    cu=bpy.data.curves.new(name, 'CURVE'); cu.dimensions='3D'; cu.resolution_u=16
    cu.bevel_depth=bevel; cu.bevel_resolution=4
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for i,p in enumerate(pts):
        bp=sp.bezier_points[i]; bp.co=Vector(p); bp.handle_left_type=bp.handle_right_type='AUTO'
        bp.radius=(radii[i] if radii else 1)
    o=bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o

def fin(name, shape, th, mat, loc, rot, rib_mat=None):
    verts=[]
    for y in (-th/2, th/2):
        verts += [(x,y,z) for x,z in shape]
    n=len(shape); faces=[tuple(range(n)), tuple(range(n,2*n))[::-1]]
    for i in range(n):
        j=(i+1)%n; faces.append((i,j,n+j,n+i))
    me=bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o=bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location=loc; o.rotation_euler=Euler(rot); o.data.materials.append(mat)
    for p in me.polygons: p.use_smooth=False
    if rib_mat:
        for i,(x,z) in enumerate(shape[1:-1]):
            r=curve(f'{name}_rib{i}', [(x*.12,-.005,z*.12),(x*.96,-th*.7,z*.96)], .004, rib_mat)
            r.parent=o
    return o

def panel(name, pts, y, mat):
    # polygon in XZ at fixed y, two-sided
    n=len(pts); verts=[(x,y,z) for x,z in pts]
    me=bpy.data.meshes.new(name); me.from_pydata(verts, [], [tuple(range(n))]); me.update()
    o=bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o

def apron_mesh(name, rows, mat):
    verts=[]; faces=[]; cols=5
    for z,w,y in rows:
        for i in range(cols):
            t=i/(cols-1)-.5
            verts.append((t*w*2, y + abs(t)*.012, z))
    for r in range(len(rows)-1):
        for i in range(cols-1):
            a=r*cols+i; b=a+1; c=a+cols; d=c+1
            faces.append((a,b,d,c))
    me=bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o=bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o

# ---------------------------------------------------------------- body
for s in (-1,1):
    sphere(f'Shoe_{s}', (s*.085,-.055,.065), (.072,.13,.055), DRESS, 32,16)
    between(f'Leg_{s}', (s*.085,0,.10), (s*.085,0,.48), .048, SKIN)
    sphere(f'Knee_{s}', (s*.085,-.012,.48), (.05,.05,.055), SKIN, 24,12)
sphere('Hips', (0,0,.68), (.17,.12,.14), DRESS)
sphere('Bodice', (0,0,.98), (.145,.11,.22), DRESS)
sphere('Bust', (0,-.03,1.10), (.15,.10,.11), DRESS_L)
cyl('Neck', (0,0,1.27), .043, .10, SKIN)
# skirt
cone('Skirt', (0,0,.56), .16, .34, .42, DRESS, 80)
# apron shaped panel
apron_mesh('Apron', [(1.04,.062,-.323),(.82,.075,-.338),(.62,.095,-.344),(.50,.105,-.342)], WHITE)
panel('ApronBib', [(-.065,1.06),(.065,1.06),(.055,1.21),(-.055,1.21)], -.338, WHITE)
for s in (-1,1):
    curve(f'ApronSide_{s}', [(s*.065,-.325,1.03),(s*.09,-.34,.82),(s*.105,-.34,.50)], .004, GOLD)
for i in range(7):
    t=i/6-.5
    sphere(f'ApronRuffle_{i}', (t*.26,-.338,.49+abs(t)*.010), (.021,.007,.014), WHITE_S, 16,8)
# apron ties
for s in (-1,1):
    curve(f'ApronTie_{s}', [(s*.15,-.30,1.02),(s*.26,-.21,.82),(s*.20,-.27,.68)], .012, WHITE)
# bodice details
for i in range(4):
    sphere(f'Button_{i}', (0,-.145,1.05-i*.055), (.015,.008,.015), GOLD, 16,8)
torus('Collar', (0,0,1.24), .065, .009, WHITE)
# neck bow
for s in (-1,1):
    sphere(f'BowNeck_{s}', (s*.05,-.14,1.21), (.042,.018,.028), DRESS, 24,12, (0,0,s*.5))
sphere('BowKnot', (0,-.155,1.21), (.022,.014,.022), GOLD, 16,8)
# back bow
for s in (-1,1):
    sphere(f'BackBow_{s}', (s*.11,.155,.88), (.10,.035,.07), DRESS, 32,16, (0,0,s*.45))
    sphere(f'BackBowEdge_{s}', (s*.11,.17,.88), (.085,.012,.05), GOLD, 24,12, (0,0,s*.45))
# sleeves
for s in (-1,1):
    sphere(f'Sleeve_{s}', (s*.19,0,1.12), (.10,.085,.10), WHITE, 40,20)
    cyl(f'Cuff_{s}', (s*.225,-.005,.99), .065, .07, DRESS, 24)
# arms in a relaxed visible pose, single smooth tube each
for s in (-1,1):
    sh=(s*.19,-.015,1.12); el=(s*.30,-.075,.95); wr=(s*.33,-.105,.79); hand=(s*.35,-.14,.71)
    curve(f'Arm_{s}', [sh, el, wr], .040, SKIN, [1,.95,.8])
    sphere(f'Hand_{s}', wr, (.047,.036,.050), SKIN, 20,10)
# ---------------------------------------------------------------- head
HZ=1.47
sphere('Head', (0,-.01,HZ), (.15,.135,.16), SKIN, 64,32)
for s in (-1,1):
    sphere(f'Ear_{s}', (s*.15,-.005,HZ), (.022,.018,.045), SKIN, 16,8)
# eyes: flatter, less bug-eyed
for s in (-1,1):
    x=s*.055
    sphere(f'EyeWhite_{s}', (x,-.128,HZ+.005), (.038,.014,.044), EYE_W, 32,16)
    sphere(f'Iris_{s}', (x,-.142,HZ+.002), (.027,.008,.036), EYE_D, 28,14)
    sphere(f'IrisBlue_{s}', (x,-.149,HZ+.003), (.020,.005,.028), EYE_B, 24,12)
    sphere(f'Pupil_{s}', (x,-.154,HZ), (.010,.004,.022), DARK, 16,8)
    sphere(f'Glint_{s}', (x-.006,-.158,HZ+.018), (.006,.003,.009), EYE_H, 12,6)
    sphere(f'Glint2_{s}', (x+.011,-.157,HZ-.012), (.004,.002,.006), EYE_H, 12,6)
    curve(f'Lash_{s}', [(x-.040,-.150,HZ+.040),(x,-.158,HZ+.050),(x+.040,-.150,HZ+.040)], .005, DARK)
    curve(f'Brow_{s}', [(x-.040,-.130,HZ+.085),(x,-.142,HZ+.090),(x+.040,-.130,HZ+.085)], .004, HAIR_D)
    # blush
    sphere(f'Blush_{s}', (s*.085,-.135,HZ-.045), (.032,.006,.015), BLUSH, 16,8)
sphere('Nose', (0,-.152,HZ-.025), (.010,.007,.008), SKIN, 12,6)
curve('Mouth', [(-.022,-.150,HZ-.062),(0,-.155,HZ-.068),(.022,-.150,HZ-.062)], .0035, EYE_D)
# ---------------------------------------------------------------- hair
sphere('Hair_Cap', (0,.012,HZ+.012), (.17,.155,.165), HAIR_D, 64,32)
sphere('Hair_BackMass', (0,.10,HZ-.05), (.155,.115,.21), HAIR_D, 48,24)
# back long strands
for i in range(16):
    t=i/15-.5
    x=t*.24; y=.11+abs(t)*.025
    mat=HAIR_T if i%4==0 else (HAIR_M if i%2 else HAIR_D)
    curve(f'Hair_Back_{i}', [(x*.5,y*.7,HZ+.02),(x*1.2,y+.05,HZ-.24),(x*1.8,y+.02,.74+abs(t)*.10)], .024-abs(t)*.006, mat, [1,.85,.12])
# outer back locks, framing the silhouette
for s in (-1,1):
    curve(f'Hair_Outer_{s}', [(s*.10,.06,HZ+.08),(s*.23,.12,HZ-.18),(s*.27,.10,HZ-.48),(s*.24,.08,HZ-.72)], .026, HAIR_D, [1,.8,.5,.1])
# side locks (front)
for s in (-1,1):
    curve(f'Hair_Side_{s}', [(s*.10,-.01,HZ+.10),(s*.18,-.06,HZ-.12),(s*.22,-.06,HZ-.46),(s*.18,-.03,HZ-.68)], .030, HAIR_M, [1,.9,.6,.12])
    curve(f'Hair_SideTip_{s}', [(s*.11,-.06,HZ+.03),(s*.18,-.10,HZ-.18),(s*.16,-.10,HZ-.36)], .018, HAIR_T, [1,.7,.1])
# bangs: layered shorter pieces, not bars
for i in range(7):
    t=i/6-.5; x=t*.18
    curve(f'Bang_{i}', [(x, .00, HZ+.13),(x*1.05,-.13,HZ+.11),(x*1.22,-.155,HZ+.01+abs(t)*.03)], .019, HAIR_D if i%2 else HAIR_M, [1,.7,.08])
# side fringe
for s in (-1,1):
    curve(f'Fringe_{s}', [(s*.05,-.02,HZ+.14),(s*.12,-.14,HZ+.09),(s*.15,-.15,HZ-.02)], .016, HAIR_M, [1,.7,.1])
# ahoge
curve('Ahoge', [(0,.01,HZ+.16),(.02,.02,HZ+.28),(.07,.00,HZ+.34),(.12,-.01,HZ+.30)], .010, HAIR_T, [1,.75,.5,.05])
# ---------------------------------------------------------------- fins/tail
for s in (-1,1):
    fin(f'EarFin_{s}', [(0,0),(.08,.045),(.18,.035),(.24,-.005),(.16,-.055),(.04,-.07)],
        .010, FIN, (s*.145,.02,HZ+.01), (0,s*.18,s*math.radians(10)), GOLD)
# tail arcs to the character's right/back, visible from 3/4
curve('Tail_Root', [(.08,.13,.76),(.19,.22,.66),(.29,.28,.53),(.36,.30,.39),(.37,.30,.28)], .055, HAIR_D, [1,.95,.8,.6,.3])
curve('Tail_Glow', [(.08,.14,.75),(.19,.23,.65),(.29,.29,.52),(.36,.31,.38),(.37,.31,.27)], .010, FIN, [1,.9,.7,.5,.15])
fin('Tail_Fin', [(-.04,0),(-.22,.10),(-.34,.03),(-.24,-.08),(0,-.04),(.24,-.08),(.34,.03),(.22,.10)],
    .028, FIN, (.41,.31,.30), (math.radians(18),0,math.radians(-38)), GOLD)
fin('Tail_Dorsal', [(0,0),(.04,.10),(.09,.02),(.03,-.02)], .010, FIN, (.28,.29,.54), (math.radians(20),0,0), GOLD)
# hairpin
curve('Hairpin_Tail', [(-.115,-.065,HZ+.12),(-.155,-.09,HZ+.10),(-.18,-.08,HZ+.12)], .006, GOLD, [1,.8,.1])
sphere('HairpinGem', (-.155,-.09,HZ+.10), (.012,.007,.012), EYE_H, 16,8)

# ---------------------------------------------------------------- finalize
for o in list(bpy.context.scene.objects):
    if o.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.select_set(True); bpy.context.view_layer.objects.active=o
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
# pearls necklace (small, after transforms)
for i in range(16):
    a=i/16*math.tau
    sphere(f'Pearl_{i}', (math.cos(a)*.085, -.105, 1.235+math.sin(a)*.028), (.009,.007,.009), PEARL if i%4 else GOLD, 12,6)

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)

# preview render
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=900; scene.render.resolution_y=1150
scene.render.film_transparent=False
world=bpy.data.worlds.new('PreviewWorld'); scene.world=world; world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs[0].default_value=(0.006,0.018,0.028,1); bg.inputs[1].default_value=1.0
# floor for shadow
bpy.ops.mesh.primitive_plane_add(size=10, location=(0,0,0))
floor=bpy.context.object; floor.name='PreviewFloor'; floor.data.materials.append(material('MAT_Floor',(0.012,0.035,0.045),.8))
# camera 3/4
cam_data=bpy.data.cameras.new('PreviewCam'); cam=bpy.data.objects.new('PreviewCam',cam_data); bpy.context.collection.objects.link(cam)
cam.location=(1.8,-3.5,1.6); cam.rotation_euler=(Vector((0,0,1.05))-cam.location).to_track_quat('-Z','Y').to_euler(); cam_data.lens=58; scene.camera=cam
# lights
for name,loc,energy,size,color in [('Key',(2.4,-3.0,3.3),520,3.5,(1.0,.88,.76)),('Fill',(-2.5,-1.6,2.2),300,3.0,(.5,.85,1.0)),('Rim',(-1.5,2.2,2.9),650,2.5,(.4,1.0,.95))]:
    ld=bpy.data.lights.new(name,'AREA'); ld.energy=energy; ld.size=size; ld.color=color
    lo=bpy.data.objects.new(name,ld); bpy.context.collection.objects.link(lo); lo.location=loc
    lo.rotation_euler=(Vector((0,0,1.1))-lo.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=PREVIEW
bpy.ops.render.render(write_still=True)
print(f'WHALE_GIRL_EXPORTED {OUT}')
