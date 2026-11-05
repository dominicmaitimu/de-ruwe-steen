import { Capacitor, registerPlugin } from '@capacitor/core'
import { fromBase64, toBase64 } from './backup.logic'

interface FileResult {
  cancelled: boolean
  fileName?: string
  content?: string
}

interface DeRuweSteenFilesPlugin {
  pickBackup(): Promise<FileResult>
  saveFile(options: { fileName: string; content: string }): Promise<FileResult>
}

const deRuweSteenFiles = registerPlugin<DeRuweSteenFilesPlugin>('DeRuweSteenFiles')

export async function saveUserFile(fileName: string, content: string): Promise<boolean> {
  if (Capacitor.getPlatform() === 'android') {
    const result = await deRuweSteenFiles.saveFile({ fileName, content: toBase64(content) })
    return !result.cancelled
  }
  const blob = new Blob([content], { type: fileName.endsWith('.json') ? 'application/json' : 'application/vnd.deruwesteen.backup' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return true
}

export async function chooseBackupFile(): Promise<{ fileName: string; content: string } | null> {
  if (Capacitor.getPlatform() === 'android') {
    const result = await deRuweSteenFiles.pickBackup()
    if (result.cancelled) return null
    if (!result.fileName || !result.content) throw new Error('De bestandskiezer gaf geen geldige bestandsgegevens terug.')
    return { fileName: result.fileName, content: fromBase64(result.content) }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error('Het back-upbestand is groter dan 20 MB.'))
        return
      }
      void file.text().then((content) => resolve({ fileName: file.name, content })).catch(reject)
    }
    input.click()
  })
}
