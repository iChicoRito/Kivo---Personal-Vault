import { AttachmentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Pdf from '@thesvg/react/pdf'
import MicrosoftWord from '@thesvg/react/microsoft-word'
import MicrosoftExcel from '@thesvg/react/microsoft-excel'
import MicrosoftPowerpoint from '@thesvg/react/microsoft-powerpoint'
import GoogleSheets from '@thesvg/react/google-sheets'
import Notepadplusplus from '@thesvg/react/notepadplusplus'
import Markdown from '@thesvg/react/markdown'
import Jpeg from '@thesvg/react/jpeg'
import Photoshop from '@thesvg/react/photoshop'
import Illustrator from '@thesvg/react/illustrator'
import Figma from '@thesvg/react/figma'
import Sketch from '@thesvg/react/sketch'
import Xd from '@thesvg/react/xd'
import Svg from '@thesvg/react/svg'
import Winamp from '@thesvg/react/winamp'
import VlcMediaPlayer from '@thesvg/react/vlc-media-player'
import Html5 from '@thesvg/react/html5'
import Css3 from '@thesvg/react/css3'
import Javascript from '@thesvg/react/javascript'
import React from '@thesvg/react/react'
import Typescript from '@thesvg/react/typescript'
import Json from '@thesvg/react/json'
import Xml from '@thesvg/react/xml'
import Yaml from '@thesvg/react/yaml'
import Python from '@thesvg/react/python'
import Java from '@thesvg/react/java'
import C from '@thesvg/react/c'
import Cplusplus from '@thesvg/react/cplusplus'
import Csharp from '@thesvg/react/csharp'
import Php from '@thesvg/react/php'
import Ruby from '@thesvg/react/ruby'
import Go from '@thesvg/react/go'
import Rust from '@thesvg/react/rust'
import Swift from '@thesvg/react/swift'
import Kotlin from '@thesvg/react/kotlin'
import Postgresql from '@thesvg/react/postgresql'
import Sqlite from '@thesvg/react/sqlite'
import Bash from '@thesvg/react/bash'
import I7zip from '@thesvg/react/7zip'
import Windows from '@thesvg/react/windows'
import Apple from '@thesvg/react/apple'
import Debian from '@thesvg/react/debian'
import Android from '@thesvg/react/android'

import type { ComponentType, SVGProps } from 'react'

type FileIconComponent = ComponentType<SVGProps<SVGSVGElement>>

const ICON_BY_EXTENSION: Record<string, FileIconComponent> = {
  pdf: Pdf,
  doc: MicrosoftWord,
  docx: MicrosoftWord,
  xls: MicrosoftExcel,
  xlsx: MicrosoftExcel,
  ppt: MicrosoftPowerpoint,
  pptx: MicrosoftPowerpoint,
  csv: GoogleSheets,
  txt: Notepadplusplus,
  md: Markdown,
  jpg: Jpeg,
  jpeg: Jpeg,
  psd: Photoshop,
  ai: Illustrator,
  fig: Figma,
  sketch: Sketch,
  xd: Xd,
  svg: Svg,
  mp3: Winamp,
  wav: Winamp,
  mp4: VlcMediaPlayer,
  mov: VlcMediaPlayer,
  html: Html5,
  css: Css3,
  js: Javascript,
  jsx: React,
  ts: Typescript,
  tsx: Typescript,
  json: Json,
  xml: Xml,
  yml: Yaml,
  yaml: Yaml,
  py: Python,
  java: Java,
  c: C,
  cpp: Cplusplus,
  cs: Csharp,
  php: Php,
  rb: Ruby,
  go: Go,
  rs: Rust,
  swift: Swift,
  kt: Kotlin,
  sql: Postgresql,
  db: Sqlite,
  sh: Bash,
  zip: I7zip,
  '7z': I7zip,
  rar: I7zip,
  exe: Windows,
  msi: Windows,
  dmg: Apple,
  deb: Debian,
  apk: Android,
}

export function fileIconSlug(name: string | null | undefined): string | null {
  if (!name) return null
  const separator = name.lastIndexOf('.')
  if (separator <= 0 || separator >= name.length - 1) return null
  const extension = name.slice(separator + 1).toLowerCase()
  return extension in ICON_BY_EXTENSION ? extension : null
}

type FileTypeIconProps = {
  name: string | null | undefined
  size?: number
  className?: string
}

export function FileTypeIcon({ name, size = 28, className }: FileTypeIconProps) {
  const slug = fileIconSlug(name)
  const Icon = slug ? ICON_BY_EXTENSION[slug] : null

  return (
    <span className={className} data-file-icon={slug ?? 'attachment'}>
      {Icon ? (
        <Icon aria-hidden="true" height={size} width={size} />
      ) : (
        <HugeiconsIcon
          aria-hidden="true"
          className="text-muted"
          icon={AttachmentIcon}
          size={size}
          strokeWidth={1.75}
        />
      )}
    </span>
  )
}
