#ifndef REFU_WORLD_H
#define REFU_WORLD_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define WORLD_ABI_MAJOR 1u
#define WORLD_ABI_MINOR 0u
#define WORLD_ABI_VERSION ((WORLD_ABI_MAJOR << 16) | WORLD_ABI_MINOR)
#define WORLD_ENTITY_NONE UINT64_MAX

typedef struct WorldHandle WorldHandle;

typedef struct {
    uint32_t abi_version;
    uint32_t struct_size;
    const char* user_data_dir;
    const char* locale;
    uint32_t flags;
} WorldConfig;

typedef struct {
    uint32_t index;
    uint32_t generation;
    float    position[3];
    float    rotation[4];
    float    scale[3];
    /* flags 低 8 位：1=player, 2=actor, 3=prop, 4=item；适配器用于视图资源选择。 */
    uint32_t flags;
} WorldTransformPod;

typedef int32_t WorldStatus;
enum {
    WORLD_OK = 0,
    WORLD_ERR_BUFFER_TOO_SMALL = 1,
    WORLD_ERR_INVALID_ARG = 2,
    WORLD_ERR_PACK = 3,
    WORLD_ERR_SAVE = 4,
    WORLD_ERR_PANIC = 5,
    WORLD_ERR_VERSION = 6,
    WORLD_ERR_STATE = 7,
    WORLD_ERR_UNSUPPORTED = 8,
    WORLD_ERR_INTERNAL = 9
};

WorldHandle* world_create(const WorldConfig* config);
void         world_destroy(WorldHandle* world);

WorldStatus  world_load_pack(WorldHandle* world, const uint8_t* bytes, size_t len);
WorldStatus  world_tick(WorldHandle* world, uint64_t frame_dt_us, uint32_t* out_ticks);
WorldStatus  world_command(WorldHandle* world, const uint8_t* bytes, size_t len,
                           uint8_t* out, size_t cap, size_t* out_len);
WorldStatus  world_poll_events(WorldHandle* world, uint8_t* out, size_t cap, size_t* out_len);
size_t       world_copy_transforms(WorldHandle* world, WorldTransformPod* out, size_t cap);
uint64_t     world_state_hash(WorldHandle* world);
uint64_t     world_find_entity(WorldHandle* world, const char* content_id);

WorldStatus  world_save(WorldHandle* world, uint8_t* out, size_t cap, size_t* out_len);
WorldStatus  world_load_save(WorldHandle* world, const uint8_t* bytes, size_t len);

WorldStatus  world_activate_zone(WorldHandle* world, const char* zone_id);
WorldStatus  world_deactivate_zone(WorldHandle* world, const char* zone_id);
WorldStatus  world_zone_assets(WorldHandle* world, const char* zone_id,
                               uint8_t* out, size_t cap, size_t* out_len);
/* 返回实体的 visual 源路径（逻辑资产 ID 解析后的 source）；无 visual 返回空串。 */
WorldStatus  world_entity_visual_source(WorldHandle* world, uint32_t index, uint32_t generation,
                                        uint8_t* out, size_t cap, size_t* out_len);
int32_t      world_zone_status(WorldHandle* world, const char* zone_id);
WorldStatus  world_set_zone_visible(WorldHandle* world, const char* zone_id, int32_t visible);

WorldStatus  world_suspend(WorldHandle* world, int32_t suspended);
WorldStatus  world_set_timescale(WorldHandle* world, float scale);

const char*  world_last_error(WorldHandle* world);
const char*  world_core_version(void);

#ifdef __cplusplus
}
#endif

#endif
