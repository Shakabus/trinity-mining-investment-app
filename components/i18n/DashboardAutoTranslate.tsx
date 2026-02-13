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

function shouldTranslateNode(node: Text) {
  const parent = node.parentElement
  if (!parent) return false
  if (BLOCKED_TAG_NAMES.has(parent.tagName)) return false
  if (parent.closest('[data-no-auto-translate="true"]')) return false
  return true
}

function applyLanguageToNode(node: Text, language: LanguageCode, originals: WeakMap<Text, string>) {
  if (!shouldTranslateNode(node)) return

  const existingOriginal = originals.get(node)
  const originalValue = existingOriginal ?? node.nodeValue ?? ''
  if (!existingOriginal) {
    originals.set(node, originalValue)
  }

  if (!originalValue.trim()) return

  const nextValue = language === 'en' ? originalValue : translateText(originalValue, language)
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue
  }
}

function applyLanguageToTree(root: Node, language: LanguageCode, originals: WeakMap<Text, string>) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyLanguageToNode(root as Text, language, originals)
    return
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    applyLanguageToNode(current as Text, language, originals)
    current = walker.nextNode()
  }
}

export default function DashboardAutoTranslate({ language }: { language: LanguageCode }) {
  const originalsRef = useRef(new WeakMap<Text, string>())

  useEffect(() => {
    if (typeof document === 'undefined') return

    let rafId = 0

    const run = () => {
      applyLanguageToTree(document.body, language, originalsRef.current)
    }

    const scheduleRun = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        run()
      })
    }

    run()

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          applyLanguageToNode(mutation.target as Text, language, originalsRef.current)
          continue
        }

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            applyLanguageToTree(node, language, originalsRef.current)
          }
        }
      }

      scheduleRun()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [language])

  return null
}
