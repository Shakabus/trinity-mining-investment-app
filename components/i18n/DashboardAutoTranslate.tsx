'use client'

import { useEffect, useRef } from 'react'
import { type LanguageCode, translateText } from '@/lib/i18n'

const BLOCKED_TAG_NAMES = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'CODE',
  'PRE',
])
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'] as const
const INPUT_VALUE_TRANSLATABLE_TYPES = new Set(['button', 'submit', 'reset'])

const STORAGE_PREFIX = 'dashboard_auto_i18n_cache_v1:'
const REMOTE_BATCH_SIZE = 120
const REMOTE_FLUSH_INTERVAL_MS = 150
const REMOTE_FLUSH_BUDGET_MS = 8000
const REMOTE_MISS_COOLDOWN_MS = 5 * 60 * 1000

function normalizePhrase(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function cacheKey(language: LanguageCode, text: string) {
  return `${language}:${normalizePhrase(text)}`
}

function withOriginalSpacing(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? ''
  const trailing = original.match(/\s*$/)?.[0] ?? ''
  return `${leading}${translated}${trailing}`
}

function shouldTranslateNode(node: Text) {
  const parent = node.parentElement
  if (!parent) return false
  if (BLOCKED_TAG_NAMES.has(parent.tagName)) return false
  if (parent.closest('[data-no-auto-translate="true"]')) return false
  if (parent.closest('iframe')) return false
  if (parent.closest('.tradingview-widget-container')) return false
  return true
}

function shouldTranslateElement(element: Element) {
  if (BLOCKED_TAG_NAMES.has(element.tagName)) return false
  if (element.closest('[data-no-auto-translate="true"]')) return false
  if (element.closest('iframe')) return false
  if (element.closest('.tradingview-widget-container')) return false
  return true
}

function canRequestRemoteTranslation(text: string) {
  if (!text) return false
  if (text.length < 2 || text.length > 420) return false
  if (!/[A-Za-z]/.test(text)) return false
  if (/^[$0-9.,%\-+:/() ]+$/.test(text)) return false
  return true
}

async function fetchGoogleTranslateBatch(texts: string[], language: LanguageCode): Promise<TranslateBatchResult> {
  const response = await fetch('/api/public/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts,
      language,
    }),
  })
  if (response.status === 429) {
    const retryAfterFromHeader = Number(response.headers.get('Retry-After') || '')
    const payload = (await response.json().catch(() => null)) as { retryAfterSec?: unknown } | null
    const retryAfterSecFromBody =
      typeof payload?.retryAfterSec === 'number' && Number.isFinite(payload.retryAfterSec)
        ? payload.retryAfterSec
        : 0
    const retryAfterSec = Math.max(retryAfterFromHeader || 0, retryAfterSecFromBody || 0, 2)
    return {
      map: new Map<string, string>(),
      retryAfterMs: retryAfterSec * 1000,
    }
  }

  if (!response.ok) return { map: new Map<string, string>() }

  const payload = (await response.json().catch(() => null)) as
    | {
        translations?: Array<string | null>
      }
    | null

  const translatedList = Array.isArray(payload?.translations) ? payload.translations : []
  const map = new Map<string, string>()
  translatedList.forEach((translated, index) => {
    if (typeof translated !== 'string') return
    const nextValue = translated.trim()
    if (!nextValue) return
    const sourceText = texts[index]
    if (!sourceText || nextValue === sourceText) return
    map.set(sourceText, nextValue)
  })

  return { map }
}

type TranslateBatchResult = {
  map: Map<string, string>
  retryAfterMs?: number
}

function safeReadStorage(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function safeWriteStorage(storageKey: string, value: Record<string, string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // ignore storage quota / privacy-mode errors
  }
}

function getOrCreateAttributeMap(
  store: WeakMap<Element, Map<string, string>>,
  element: Element,
) {
  const existing = store.get(element)
  if (existing) return existing
  const created = new Map<string, string>()
  store.set(element, created)
  return created
}

export default function DashboardAutoTranslate({
  language,
  remoteEnabled = true,
}: {
  language: LanguageCode
  remoteEnabled?: boolean
}) {
  const originalsRef = useRef(new WeakMap<Text, string>())
  const lastAppliedRef = useRef(new WeakMap<Text, string>())
  const originalAttributesRef = useRef(new WeakMap<Element, Map<string, string>>())
  const lastAppliedAttributesRef = useRef(new WeakMap<Element, Map<string, string>>())
  const remoteCacheRef = useRef(new Map<string, string>())
  const missCacheRef = useRef(new Map<string, number>())
  const pendingRef = useRef(new Set<string>())
  const processingRef = useRef(false)
  const cooldownUntilRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = `${STORAGE_PREFIX}${language}`
    const parsed = safeReadStorage(storageKey)
    remoteCacheRef.current = new Map(Object.entries(parsed))
    missCacheRef.current.clear()
    pendingRef.current.clear()
    processingRef.current = false
    cooldownUntilRef.current = 0
  }, [language])

  useEffect(() => {
    if (typeof document === 'undefined') return

    let rafId = 0

    const resolveValue = (originalValue: string) => {
      if (!originalValue.trim()) return originalValue

      if (language === 'en') {
        return originalValue
      }

      let nextValue = translateText(originalValue, language)
      const now = Date.now()

      if (nextValue === originalValue) {
        const cacheLookupKey = cacheKey(language, originalValue)
        const cached = remoteCacheRef.current.get(cacheLookupKey)
        if (cached) {
          nextValue = withOriginalSpacing(originalValue, cached)
        } else if (remoteEnabled && canRequestRemoteTranslation(originalValue.trim())) {
          const trimmed = originalValue.trim()
          const missUntil = missCacheRef.current.get(cacheKey(language, trimmed)) ?? 0
          if (missUntil <= now) {
            pendingRef.current.add(trimmed)
          }
        }
      }

      return nextValue
    }

    const applyLanguageToNode = (node: Text) => {
      if (!shouldTranslateNode(node)) return

      const currentValue = node.nodeValue ?? ''
      const existingOriginal = originalsRef.current.get(node)
      const lastApplied = lastAppliedRef.current.get(node)

      if (!existingOriginal) {
        originalsRef.current.set(node, currentValue)
      } else if (lastApplied && currentValue !== lastApplied && currentValue !== existingOriginal) {
        // source changed by React or live updates; reset base text
        originalsRef.current.set(node, currentValue)
      }

      const originalValue = originalsRef.current.get(node) ?? currentValue
      if (!originalValue.trim()) return

      const nextValue = resolveValue(originalValue)

      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue
      }
      lastAppliedRef.current.set(node, nextValue)
    }

    const applyLanguageToElement = (element: Element) => {
      if (!shouldTranslateElement(element)) return

      const originalMap = getOrCreateAttributeMap(originalAttributesRef.current, element)
      const lastAppliedMap = getOrCreateAttributeMap(lastAppliedAttributesRef.current, element)

      for (const attributeName of TRANSLATABLE_ATTRIBUTES) {
        const currentAttributeValue = element.getAttribute(attributeName)
        if (currentAttributeValue == null) continue

        const existingOriginal = originalMap.get(attributeName)
        const lastApplied = lastAppliedMap.get(attributeName)

        if (!existingOriginal) {
          originalMap.set(attributeName, currentAttributeValue)
        } else if (
          lastApplied &&
          currentAttributeValue !== lastApplied &&
          currentAttributeValue !== existingOriginal
        ) {
          originalMap.set(attributeName, currentAttributeValue)
        }

        const originalValue = originalMap.get(attributeName) ?? currentAttributeValue
        const nextValue = resolveValue(originalValue)
        if (currentAttributeValue !== nextValue) {
          element.setAttribute(attributeName, nextValue)
        }
        lastAppliedMap.set(attributeName, nextValue)
      }

      if (element instanceof HTMLInputElement) {
        if (!INPUT_VALUE_TRANSLATABLE_TYPES.has(element.type)) return
        if (!element.value.trim()) return

        const valueKey = 'value'
        const existingOriginal = originalMap.get(valueKey)
        const lastApplied = lastAppliedMap.get(valueKey)

        if (!existingOriginal) {
          originalMap.set(valueKey, element.value)
        } else if (lastApplied && element.value !== lastApplied && element.value !== existingOriginal) {
          originalMap.set(valueKey, element.value)
        }

        const originalValue = originalMap.get(valueKey) ?? element.value
        const nextValue = resolveValue(originalValue)
        if (element.value !== nextValue) {
          element.value = nextValue
        }
        lastAppliedMap.set(valueKey, nextValue)
      }
    }

    const applyLanguageToTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        applyLanguageToNode(root as Text)
        return
      }

      if (root.nodeType === Node.ELEMENT_NODE) {
        applyLanguageToElement(root as Element)
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        applyLanguageToNode(current as Text)
        current = walker.nextNode()
      }

      const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
      let elementNode = elementWalker.nextNode()
      while (elementNode) {
        applyLanguageToElement(elementNode as Element)
        elementNode = elementWalker.nextNode()
      }
    }

    const scheduleApply = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        applyLanguageToTree(document.body)
      })
    }

    const flushRemoteQueue = async () => {
      if (!remoteEnabled) return
      if (processingRef.current || language === 'en' || pendingRef.current.size === 0) return
      if (Date.now() < cooldownUntilRef.current) return

      processingRef.current = true
      try {
        const startTime = Date.now()
        let cacheUpdated = false

        while (pendingRef.current.size > 0 && Date.now() - startTime < REMOTE_FLUSH_BUDGET_MS) {
          const batch = Array.from(pendingRef.current).slice(0, REMOTE_BATCH_SIZE)
          batch.forEach(value => pendingRef.current.delete(value))
          const unresolvedTexts = batch.filter(sourceText => !remoteCacheRef.current.has(cacheKey(language, sourceText)))

          if (!unresolvedTexts.length) {
            continue
          }

          const result: TranslateBatchResult = await fetchGoogleTranslateBatch(unresolvedTexts, language).catch(
            () => ({
              map: new Map<string, string>(),
            }),
          )

          if (result.retryAfterMs) {
            cooldownUntilRef.current = Date.now() + result.retryAfterMs
            unresolvedTexts.forEach(text => pendingRef.current.add(text))
            break
          }

          unresolvedTexts.forEach(sourceText => {
            const translated = result.map.get(sourceText)
            if (translated && translated !== sourceText) {
              remoteCacheRef.current.set(cacheKey(language, sourceText), translated)
              missCacheRef.current.delete(cacheKey(language, sourceText))
              cacheUpdated = true
            } else {
              missCacheRef.current.set(
                cacheKey(language, sourceText),
                Date.now() + REMOTE_MISS_COOLDOWN_MS,
              )
            }
          })
        }

        if (cacheUpdated) {
          safeWriteStorage(`${STORAGE_PREFIX}${language}`, Object.fromEntries(remoteCacheRef.current.entries()))
          scheduleApply()
        }
      } finally {
        processingRef.current = false
      }
    }

    applyLanguageToTree(document.body)
    if (remoteEnabled) {
      // Prime the queue with all visible texts once per language switch.
      const bootstrapTexts = new Set<string>()
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node) {
        const textNode = node as Text
        if (shouldTranslateNode(textNode)) {
          const value = (originalsRef.current.get(textNode) ?? textNode.nodeValue ?? '').trim()
          if (
            value &&
            canRequestRemoteTranslation(value) &&
            !remoteCacheRef.current.has(cacheKey(language, value))
          ) {
            const missUntil = missCacheRef.current.get(cacheKey(language, value)) ?? 0
            if (missUntil <= Date.now()) {
              bootstrapTexts.add(value)
            }
          }
        }
        node = walker.nextNode()
      }

      const elementWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
      let elementNode = elementWalker.nextNode()
      while (elementNode) {
        const element = elementNode as Element
        if (shouldTranslateElement(element)) {
          for (const attributeName of TRANSLATABLE_ATTRIBUTES) {
            const value = (element.getAttribute(attributeName) ?? '').trim()
            if (
              value &&
              canRequestRemoteTranslation(value) &&
              !remoteCacheRef.current.has(cacheKey(language, value))
            ) {
              const missUntil = missCacheRef.current.get(cacheKey(language, value)) ?? 0
              if (missUntil <= Date.now()) {
                bootstrapTexts.add(value)
              }
            }
          }
          if (
            element instanceof HTMLInputElement &&
            INPUT_VALUE_TRANSLATABLE_TYPES.has(element.type) &&
            element.value.trim() &&
            canRequestRemoteTranslation(element.value.trim()) &&
            !remoteCacheRef.current.has(cacheKey(language, element.value.trim()))
          ) {
            const inputValue = element.value.trim()
            const missUntil = missCacheRef.current.get(cacheKey(language, inputValue)) ?? 0
            if (missUntil <= Date.now()) {
              bootstrapTexts.add(inputValue)
            }
          }
        }
        elementNode = elementWalker.nextNode()
      }
      bootstrapTexts.forEach(text => pendingRef.current.add(text))
      void flushRemoteQueue()
    }

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          applyLanguageToNode(mutation.target as Text)
          continue
        }

        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          applyLanguageToElement(mutation.target as Element)
          continue
        }

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            applyLanguageToTree(node)
          }
        }
      }

      scheduleApply()
      if (remoteEnabled) {
        void flushRemoteQueue()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES, 'value'],
    })

    const intervalId = remoteEnabled
      ? window.setInterval(() => {
          void flushRemoteQueue()
        }, REMOTE_FLUSH_INTERVAL_MS)
      : 0

    return () => {
      observer.disconnect()
      if (intervalId) window.clearInterval(intervalId)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [language, remoteEnabled])

  return null
}
