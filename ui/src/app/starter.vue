<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@wippy-fe/proxy'
import { Icon } from '@iconify/vue'

// Starter page: shows the module identity and how many rows the log sink has
// persisted, from GET /api/v1/starter/status.
interface Status {
  module: string
  count: number
}

const status = ref<Status | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/api/v1/starter/status')
    if (!data?.success) throw new Error(data?.error || 'Could not load starter status.')
    status.value = { module: String(data.module), count: Number(data.count) || 0 }
  } catch (e) {
    status.value = null
    error.value = e instanceof Error ? e.message : 'Could not load starter status.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="st">
    <div class="st-head">
      <div class="st-head-icon"><Icon icon="tabler:terminal-2" /></div>
      <div>
        <h1 class="st-title">{{ status?.module ?? 'acme/starter' }}</h1>
        <p class="st-sub">Log entries written through the starter sink.</p>
      </div>
    </div>

    <div v-if="loading" class="st-state">Loading…</div>
    <div v-else-if="error" class="st-state st-error">
      {{ error }}
      <button class="st-retry" type="button" @click="load">Retry</button>
    </div>
    <div v-else class="st-body">
      <div class="st-card">
        <span class="st-count">{{ status?.count ?? 0 }}</span>
        <span class="st-count-label">log entries</span>
      </div>
    </div>
  </div>
</template>
