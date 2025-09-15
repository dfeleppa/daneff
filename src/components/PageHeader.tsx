"use client";

import React from 'react'
import Breadcrumb from './Breadcrumb'

interface PageHeaderProps {
  /** Optional small overline text (e.g., Workspace, Project) */
  overline?: string
  /** Primary title (keep concise) */
  title?: string
  /** Right side actions (buttons, etc.) */
  actions?: React.ReactNode
  /** Optional tabs / secondary nav (already spaced) */
  tabs?: React.ReactNode
  /** If true, suppress the large title area (just breadcrumbs + tabs/actions) */
  compact?: boolean
  /** Custom element under title (metadata row) */
  meta?: React.ReactNode
}

/**
 * PageHeader standardizes the top presentation below the global app chrome.
 * It assumes the fixed global header + breadcrumb bar from AppLayout, so it only
 * renders interior spacing + optional title zone + tabs/actions.
 */
export default function PageHeader({ overline, title, actions, tabs, compact, meta }: PageHeaderProps) {
  return (
    <div className="px-6 pt-2 pb-4 border-b border-gray-100 bg-white/70 backdrop-blur-sm">      
      {/* Title Row */}
      {!compact && (title || overline) && (
        <div className="mb-2 flex items-start justify-between">
          <div className="min-w-0">
            {overline && (
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                {overline}
              </div>
            )}
            {title && (
              <h1 className="text-xl font-semibold text-gray-800 leading-tight truncate">{title}</h1>
            )}
            {meta && (
              <div className="mt-2">{meta}</div>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0 flex items-center space-x-2">{actions}</div>
          )}
        </div>
      )}

      {/* Tabs / Secondary Nav */}
      {tabs && (
        <div className="mt-1">
          {tabs}
        </div>
      )}
    </div>
  )
}
