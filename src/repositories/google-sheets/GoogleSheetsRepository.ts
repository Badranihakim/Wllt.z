import { transactionRepo, categoryRepo, walletRepo, budgetRepo } from '@/repositories'
import { useAuthStore } from '@/stores'
import type { Category, Wallet } from '@/types'

export class GoogleSheetsRepository {
  public static readonly SPREADSHEET_TITLE = 'Catatan Keuangan Saya - Wllt.z'
  private static readonly OLD_DB_NAME = 'wllt.z_database'

  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private handleApiError(errorData: any): never {
    const status = errorData.code
    const message = errorData.message?.toLowerCase() || ''

    if (status === 401 || message.includes('invalid authentication credentials')) {
      useAuthStore.getState().logout()
      throw new Error('Session Expired')
    }
    throw new Error(errorData.message || 'Unknown API Error')
  }

  /**
   * Search for existing spreadsheet or create a new one.
   * If old 'wllt.z_database' exists, it renames it to 'Catatan Keuangan Saya - Wllt.z'.
   */
  async getOrCreateSpreadsheet(): Promise<string> {
    // 1. Search for spreadsheet with new or old name
    const query = encodeURIComponent(
      `(name='${GoogleSheetsRepository.SPREADSHEET_TITLE}' or name='${GoogleSheetsRepository.OLD_DB_NAME}') and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    )
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    )
    const searchData = await searchRes.json()
    if (searchData.error) this.handleApiError(searchData.error)

    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0]
      // Rename if still using old name
      if (file.name !== GoogleSheetsRepository.SPREADSHEET_TITLE) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: GoogleSheetsRepository.SPREADSHEET_TITLE }),
          })
        } catch (renameErr) {
          console.warn('[GoogleSheetsRepository] Could not rename file:', renameErr)
        }
      }
      return file.id
    }

    // 2. Create if not exists
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: GoogleSheetsRepository.SPREADSHEET_TITLE },
        sheets: [
          { properties: { title: 'Catatan Keuangan' } },
          { properties: { title: 'Ringkasan & Saldo Dompet' } },
        ],
      }),
    })
    const createData = await createRes.json()
    if (createData.error) this.handleApiError(createData.error)

    return createData.spreadsheetId
  }

  /**
   * Main sync method: formats and uploads complete human-readable financial records.
   */
  async syncFullFinancialReport(targetSpreadsheetId?: string): Promise<string> {
    const spreadsheetId = targetSpreadsheetId || (await this.getOrCreateSpreadsheet())

    // 1. Fetch all local data
    const [transactions, categories, wallets, budgets] = await Promise.all([
      transactionRepo.findAll(),
      categoryRepo.findAll(),
      walletRepo.findAll(),
      budgetRepo.findAll(),
    ])

    const categoryMap = new Map<string, Category>(categories.map(c => [c.id, c]))
    const walletMap = new Map<string, Wallet>(wallets.map(w => [w.id, w]))

    // 2. Ensure sheet tabs exist ('Catatan Keuangan' and 'Ringkasan & Saldo Dompet')
    await this.ensureSheetTabs(spreadsheetId)

    // 3. Prepare Sheet 1: Catatan Keuangan
    const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

    const txRows = sortedTxs.map((t, idx) => {
      const cat = categoryMap.get(t.category_id)
      const w = walletMap.get(t.wallet_id)
      const toW = t.to_wallet_id ? walletMap.get(t.to_wallet_id) : null

      let jenis = 'Pengeluaran'
      if (t.type === 'income') jenis = 'Pemasukan'
      else if (t.type === 'transfer') jenis = 'Transfer'
      else if (t.type === 'debt') jenis = 'Hutang / Piutang'

      const kategori = cat
        ? `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`
        : t.type === 'transfer'
        ? 'Transfer Antar Dompet'
        : '-'

      const dompet =
        t.type === 'transfer'
          ? `${w?.name || 'Dompet'} ➡️ ${toW?.name || 'Dompet'}`
          : w?.name || '-'

      const pemasukan = t.type === 'income' ? t.amount : 0
      const pengeluaran = t.type === 'expense' ? t.amount : 0

      return [
        idx + 1,
        t.date,
        jenis,
        kategori,
        dompet,
        t.title,
        pemasukan,
        pengeluaran,
        t.notes || '',
      ]
    })

    const totalTxCount = sortedTxs.length
    const endRow = 4 + totalTxCount

    const sheet1Values: any[][] = [
      ['WLLT.Z - LAPORAN PENCATATAN KEUANGAN PRIBADI', '', '', '', '', '', '', '', ''],
      [
        `Terakhir Diperbarui: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      ['', '', '', '', '', '', '', '', ''],
      [
        'No',
        'Tanggal',
        'Jenis',
        'Kategori',
        'Dompet / Rekening',
        'Judul / Keterangan',
        'Pemasukan (Rp)',
        'Pengeluaran (Rp)',
        'Catatan Tambahan',
      ],
      ...(txRows.length > 0
        ? txRows
        : [['-', '-', '-', '-', '-', 'Belum ada transaksi yang dicatat', 0, 0, '-']]),
      ...(txRows.length > 0
        ? [
            ['', '', '', '', '', '', '', '', ''],
            [
              'TOTAL',
              '',
              '',
              '',
              '',
              '',
              `=SUM(G5:G${endRow})`,
              `=SUM(H5:H${endRow})`,
              '',
            ],
            [
              'SALDO BERSIH (PEMASUKAN - PENGELUARAN)',
              '',
              '',
              '',
              '',
              '',
              `=G${endRow + 2}-H${endRow + 2}`,
              '',
              '',
            ],
          ]
        : []),
    ]

    // 4. Prepare Sheet 2: Ringkasan & Saldo Dompet
    const walletRows = wallets.map(w => [
      `${w.icon ? w.icon + ' ' : ''}${w.name}`,
      w.type.toUpperCase(),
      w.balance,
      w.currency,
      w.exclude_from_total ? 'Dikecualikan dari Total' : 'Aktif',
    ])

    const budgetRows = budgets.map(b => {
      const cat = categoryMap.get(b.category_id)
      return [
        cat ? `${cat.icon ? cat.icon + ' ' : ''}${cat.name}` : 'Kategori',
        b.amount,
        b.spent,
        b.amount - b.spent,
        b.period,
      ]
    })

    const walletEndRow = 4 + wallets.length

    const sheet2Values: any[][] = [
      ['RINGKASAN DOMPET & SALDO REKENING', '', '', '', ''],
      [
        `Waktu Pembaruan: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`,
        '',
        '',
        '',
        '',
      ],
      ['', '', '', '', ''],
      ['Nama Dompet / Rekening', 'Tipe', 'Saldo Saat Ini (Rp)', 'Mata Uang', 'Status'],
      ...(walletRows.length > 0
        ? walletRows
        : [['-', '-', 0, 'IDR', 'Belum ada dompet']]),
      ...(walletRows.length > 0
        ? [['TOTAL SALDO AKTIF', '', `=SUM(C5:C${walletEndRow})`, 'IDR', '']]
        : []),
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['TARGET ANGGARAN & PENGELUARAN (BUDGETS)', '', '', '', ''],
      ['Kategori Anggaran', 'Batas Anggaran (Rp)', 'Terpakai (Rp)', 'Sisa Anggaran (Rp)', 'Periode'],
      ...(budgetRows.length > 0
        ? budgetRows
        : [['Belum ada anggaran yang dibuat', 0, 0, 0, '-']]),
    ]

    // 5. Clear old content to avoid remnants
    await Promise.all([
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Catatan Keuangan'!A1:Z5000:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      ),
      fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Ringkasan & Saldo Dompet'!A1:Z2000:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      ),
    ])

    // 6. Write formatted values
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: "'Catatan Keuangan'!A1",
              values: sheet1Values,
            },
            {
              range: "'Ringkasan & Saldo Dompet'!A1",
              values: sheet2Values,
            },
          ],
        }),
      }
    )
    const writeData = await writeRes.json()
    if (writeData.error) this.handleApiError(writeData.error)

    // 7. Format styling (Frozen rows, bold headers, background colors)
    await this.applySheetStyling(spreadsheetId)

    // 8. Mark local transactions as synced
    if (transactions.length > 0) {
      await transactionRepo.markAsSynced(transactions.map(t => t.id))
    }

    return spreadsheetId
  }

  /**
   * Ensure 'Catatan Keuangan' and 'Ringkasan & Saldo Dompet' sheet tabs exist.
   */
  private async ensureSheetTabs(spreadsheetId: string): Promise<void> {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    )
    const metaData = await metaRes.json()
    if (metaData.error) this.handleApiError(metaData.error)

    const existingSheets: Array<{ sheetId: number; title: string }> =
      metaData.sheets?.map((s: any) => ({
        sheetId: s.properties.sheetId,
        title: s.properties.title,
      })) || []

    const hasTxSheet = existingSheets.some(s => s.title === 'Catatan Keuangan')
    const hasSummarySheet = existingSheets.some(s => s.title === 'Ringkasan & Saldo Dompet')

    const requests: any[] = []

    if (!hasTxSheet) {
      const oldTxSheet = existingSheets.find(s => s.title === 'Transactions')
      if (oldTxSheet) {
        requests.push({
          updateSheetProperties: {
            properties: { sheetId: oldTxSheet.sheetId, title: 'Catatan Keuangan' },
            fields: 'title',
          },
        })
      } else if (existingSheets.length > 0) {
        requests.push({
          updateSheetProperties: {
            properties: { sheetId: existingSheets[0].sheetId, title: 'Catatan Keuangan' },
            fields: 'title',
          },
        })
      } else {
        requests.push({
          addSheet: { properties: { title: 'Catatan Keuangan' } },
        })
      }
    }

    if (!hasSummarySheet) {
      const oldWalletSheet = existingSheets.find(s => s.title === 'Wallets')
      if (oldWalletSheet) {
        requests.push({
          updateSheetProperties: {
            properties: { sheetId: oldWalletSheet.sheetId, title: 'Ringkasan & Saldo Dompet' },
            fields: 'title',
          },
        })
      } else {
        requests.push({
          addSheet: { properties: { title: 'Ringkasan & Saldo Dompet' } },
        })
      }
    }

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      })
    }
  }

  /**
   * Apply professional header styling, colors, and frozen header rows.
   */
  private async applySheetStyling(spreadsheetId: string): Promise<void> {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      )
      const metaData = await metaRes.json()
      const txSheet = metaData.sheets?.find((s: any) => s.properties.title === 'Catatan Keuangan')
      const summarySheet = metaData.sheets?.find(
        (s: any) => s.properties.title === 'Ringkasan & Saldo Dompet'
      )

      const requests: any[] = []

      if (txSheet) {
        const sheetId = txSheet.properties.sheetId
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 4 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        })

        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 4,
              startColumnIndex: 0,
              endColumnIndex: 9,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.25, blue: 0.58 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        })

        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                  fontSize: 14,
                  foregroundColor: { red: 0.1, green: 0.2, blue: 0.4 },
                },
              },
            },
            fields: 'userEnteredFormat(textFormat)',
          },
        })
      }

      if (summarySheet) {
        const sheetId = summarySheet.properties.sheetId
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 4 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        })

        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 3,
              endRowIndex: 4,
              startColumnIndex: 0,
              endColumnIndex: 5,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.42, blue: 0.28 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        })
      }

      if (requests.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        })
      }
    } catch (stylingErr) {
      console.warn('[GoogleSheetsRepository] Styling batchUpdate warning:', stylingErr)
    }
  }

  /**
   * Static trigger for background sync after transaction modifications.
   */
  static async sync(): Promise<void> {
    const { accessToken, setSpreadsheetId } = useAuthStore.getState()
    if (!accessToken) return

    try {
      const cloudRepo = new GoogleSheetsRepository(accessToken)
      const spreadsheetId = await cloudRepo.syncFullFinancialReport()
      setSpreadsheetId(spreadsheetId)
    } catch (err) {
      console.error('[GoogleSheetsRepository.sync] Background sync failed:', err)
    }
  }
}
