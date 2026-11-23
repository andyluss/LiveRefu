#include "world.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static uint8_t* read_file(const char* path, size_t* out_len) {
    FILE* f = fopen(path, "rb");
    if (!f) return NULL;
    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return NULL; }
    long n = ftell(f);
    if (n < 0) { fclose(f); return NULL; }
    rewind(f);
    uint8_t* buf = (uint8_t*)malloc((size_t)n);
    if (!buf) { fclose(f); return NULL; }
    size_t got = fread(buf, 1, (size_t)n, f);
    fclose(f);
    if (got != (size_t)n) { free(buf); return NULL; }
    *out_len = (size_t)n;
    return buf;
}

static int send_cmd(WorldHandle* w, const char* json) {
    size_t out_len = 0;
    WorldStatus st = world_command(w, (const uint8_t*)json, strlen(json), NULL, 0, &out_len);
    if (st != WORLD_OK) {
        fprintf(stderr, "world_command failed: %d (%s)\n", st, world_last_error(w));
        return 0;
    }
    return 1;
}

static int interact(WorldHandle* w, const char* actor, const char* target) {
    uint64_t a = world_find_entity(w, actor);
    uint64_t t = world_find_entity(w, target);
    if (a == WORLD_ENTITY_NONE || t == WORLD_ENTITY_NONE) {
        fprintf(stderr, "entity not found: %s -> %s\n", actor, target);
        return 0;
    }
    char json[256];
    snprintf(json, sizeof(json),
             "{\"op\":\"interact\",\"actor\":{\"index\":%u,\"generation\":%u},"
             "\"target\":{\"index\":%u,\"generation\":%u}}",
             (unsigned)(a & 0xFFFFFFFFu), (unsigned)(a >> 32),
             (unsigned)(t & 0xFFFFFFFFu), (unsigned)(t >> 32));
    return send_cmd(w, json);
}

static int pickup(WorldHandle* w, const char* actor, const char* target) {
    uint64_t a = world_find_entity(w, actor);
    uint64_t t = world_find_entity(w, target);
    if (a == WORLD_ENTITY_NONE || t == WORLD_ENTITY_NONE) {
        fprintf(stderr, "entity not found: %s -> %s\n", actor, target);
        return 0;
    }
    char json[256];
    snprintf(json, sizeof(json),
             "{\"op\":\"pickup\",\"actor\":{\"index\":%u,\"generation\":%u},"
             "\"target\":{\"index\":%u,\"generation\":%u}}",
             (unsigned)(a & 0xFFFFFFFFu), (unsigned)(a >> 32),
             (unsigned)(t & 0xFFFFFFFFu), (unsigned)(t >> 32));
    return send_cmd(w, json);
}

static int talk(WorldHandle* w, const char* actor, const char* target) {
    uint64_t a = world_find_entity(w, actor);
    uint64_t t = world_find_entity(w, target);
    if (a == WORLD_ENTITY_NONE || t == WORLD_ENTITY_NONE) {
        fprintf(stderr, "entity not found: %s -> %s\n", actor, target);
        return 0;
    }
    char json[256];
    snprintf(json, sizeof(json),
             "{\"op\":\"talk\",\"actor\":{\"index\":%u,\"generation\":%u},"
             "\"target\":{\"index\":%u,\"generation\":%u}}",
             (unsigned)(a & 0xFFFFFFFFu), (unsigned)(a >> 32),
             (unsigned)(t & 0xFFFFFFFFu), (unsigned)(t >> 32));
    return send_cmd(w, json);
}

int main(int argc, char** argv) {
    const char* pack_path = NULL;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--pack") == 0 && i + 1 < argc) {
            pack_path = argv[++i];
        }
    }
    if (!pack_path) {
        fprintf(stderr, "usage: c_host --pack path/to/pack.data\n");
        return 2;
    }

    size_t len = 0;
    uint8_t* data = read_file(pack_path, &len);
    if (!data) {
        fprintf(stderr, "cannot read %s\n", pack_path);
        return 2;
    }

    WorldConfig config;
    memset(&config, 0, sizeof(config));
    config.abi_version = WORLD_ABI_VERSION;
    config.struct_size = sizeof(config);
    config.locale = "zh-CN";

    WorldHandle* w = world_create(&config);
    if (!w) {
        fprintf(stderr, "world_create failed: %s\n", world_last_error(NULL));
        free(data);
        return 2;
    }
    if (world_load_pack(w, data, len) != WORLD_OK) {
        fprintf(stderr, "world_load_pack failed: %s\n", world_last_error(w));
        world_destroy(w);
        free(data);
        return 2;
    }
    free(data);

    size_t event_bytes = 0;
    for (uint32_t tick = 1; tick <= 600; tick++) {
        if (tick == 10) { if (!interact(w, "player", "demo.airlock")) return 3; }
        if (tick == 20) { if (!pickup(w, "player", "item.keycard")) return 3; }
        if (tick == 30) { if (!interact(w, "player", "demo.airlock")) return 3; }
        if (tick == 40) { if (!talk(w, "player", "demo.keeper")) return 3; }

        uint32_t advanced = 0;
        if (world_tick(w, 16666u, &advanced) != WORLD_OK) {
            fprintf(stderr, "world_tick failed: %s\n", world_last_error(w));
            return 3;
        }

        size_t need = 0;
        int st = world_poll_events(w, NULL, 0, &need);
        if (st == WORLD_ERR_BUFFER_TOO_SMALL && need > 0) {
            uint8_t* buf = (uint8_t*)malloc(need);
            if (!buf) { fprintf(stderr, "oom\n"); return 3; }
            if (world_poll_events(w, buf, need, &need) == WORLD_OK) {
                event_bytes += need;
            } else {
                fprintf(stderr, "poll events failed: %s\n", world_last_error(w));
                free(buf);
                return 3;
            }
            free(buf);
        }
    }

    size_t entity_count = world_copy_transforms(w, NULL, 0);
    WorldTransformPod* pods = (WorldTransformPod*)malloc(entity_count * sizeof(WorldTransformPod));
    size_t copied = 0;
    if (pods) {
        copied = world_copy_transforms(w, pods, entity_count);
        free(pods);
    }

    uint64_t hash = world_state_hash(w);
    printf("c_host final_hash=0x%016llx entities=%zu copied=%zu event_bytes=%zu\n",
           (unsigned long long)hash, entity_count, copied, event_bytes);
    world_destroy(w);
    return 0;
}
