'use client'

import { useEffect, useRef } from 'react'
import { type LanguageCode, translateText } from '@/lib/i18n'

const BLOCKED_TAG_NAMES = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'OPTION',
  'CODE',
  'PRE',
])

const STORAGE_PREFIX = 'dashboard_auto_i18n_cache_v1:'

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

function canRequestRemoteTranslation(text: string) {
  if (!text) return false
  if (text.length < 2 || text.length > 420) return false
  if (!/[A-Za-z]/.test(text)) return false
  if (/^[$0-9.,%\-+:/() ]+$/.test(text)) return false
  return true
}

async function fetchGoogleTranslate(text: string, language: LanguageCode) {
  const response = await fetch('/api/public/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language,
    }),
  })
  if (!response.ok) return null

  const payload = (await response.json().catch(() => null)) as { translated?: string | null } | null
  const translated = typeof payload?.translated === 'string' ? payload.translated.trim() : ''
  return translated || null
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

export default function DashboardAutoTranslate({ language }: { language: LanguageCode }) {
  const originalsRef = useRef(new WeakMap<Text, string>())
  const lastAppliedRef = useRef(new WeakMap<Text, string>())
  const remoteCacheRef = useRef(new Map<string, string>())
  const pendingRef = useRef(new Set<string>())
  const processingRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = `${STORAGE_PREFIX}${language}`
    const parsed = safeReadStorage(storageKey)
    remoteCacheRef.current = new Map(Object.entries(parsed))
  }, [language])

  useEffect(() => {
    if (typeof document === 'undefined') return

    let rafId = 0

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

      if (language === 'en') {
        if (node.nodeValue !== originalValue) {
          node.nodeValue = originalValue
          lastAppliedRef.current.set(node, originalValue)
        }
        return
      }

      let nextValue = translateText(originalValue, language)

      if (nextValue === originalValue) {
        const cached = remoteCacheRef.current.get(cacheKey(language, originalValue))
        if (cached) {
          nextValue = withOriginalSpacing(originalValue, cached)
        } else if (canRequestRemoteTranslation(originalValue.trim())) {
          pendingRef.current.add(originalValue.trim())
        }
      }

      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue
      }
      lastAppliedRef.current.set(node, nextValue)
    }

    const applyLanguageToTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        applyLanguageToNode(root as Text)
        return
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        applyLanguageToNode(current as Text)
        current = walker.nextNode()
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
      if (processingRef.current || language === 'en' || pendingRef.current.size === 0) return

      processingRef.current = true
      try {
        const batch = Array.from(pendingRef.current).slice(0, 6)

        for (const sourceText of batch) {
          pendingRef.current.delete(sourceText)
          const key = cacheKey(language, sourceText)
          if (remoteCacheRef.current.has(key)) continue

          const translated = await fetchGoogleTranslate(sourceText, language).catch(() => null)
          if (translated && translated !== sourceText) {
            remoteCacheRef.current.set(key, translated)
          }

          await new Promise(resolve => window.setTimeout(resolve, 120))
        }

        safeWriteStorage(`${STORAGE_PREFIX}${language}`, Object.fromEntries(remoteCacheRef.current.entries()))
        scheduleApply()
      } finally {
        processingRef.current = false
      }
    }

    applyLanguageToTree(document.body)

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          applyLanguageToNode(mutation.target as Text)
          continue
        }

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            applyLanguageToTree(node)
          }
        }
      }

      scheduleApply()
      void flushRemoteQueue()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    const intervalId = window.setInterval(() => {
      void flushRemoteQueue()
    }, 2000)

    return () => {
      observer.disconnect()
      window.clearInterval(intervalId)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [language])

  return null
}
