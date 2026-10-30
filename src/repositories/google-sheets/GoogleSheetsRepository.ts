import { transactionRepo, categoryRepo, walletRepo, budgetRepo } from '@/repositories'
import { db } from '@/db'
import { useAuthStore } from '@/stores'
import type { Category, Wallet } from '@/types'
import { formatSyncError, isNetworkError } from '@/lib/errorUtils'

export class GoogleSheetsRepository {
  public static readonly SPREADSHEET_TITLE = 'Catatan Keuangan Saya - Wllt.z'
  public static readonly SYNC_SHEET_TITLE = '_wlltz_sync_data'
  private static readonly OLD_DB_NAME = 'wllt.z_database'

  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private handleApiError(errorData: any): never {
    const status = errorData.code
    const message = errorData.message?.toLowerCase() || ''

    if (status === 401 || message.includes('invalid authentication credentials')) {
      useAuthStore.getState().setAccessToken(null)
      throw new Error('Session Expired')
    }
    throw new Error(errorData.message || 'Unknown API Error')
  }

  /**
   * Search for existing spreadsheet or create a new one.
   * If old 'wllt.z_database' exists, it renames it to 'Catatan Keuangan Saya - Wllt.z'.
   */
  async getOrCreateSpreadsheet(): Promise<string> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Perangkat sedang offline. Sambungkan ke internet untuk menghubungkan ke Google Drive.')
    }

    // 1. Search for spreadsheet with new or old name
    const query = encodeURIComponent(
      `(name='${GoogleSheetsRepository.SPREADSHEET_TITLE}' or name='${GoogleSheetsRepository.OLD_DB_NAME}') and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    )
    let searchRes: Response
    try {
      searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      )
    } catch (err: any) {
      if (isNetworkError(err)) {
        throw new Error('Perangkat sedang offline. Sambungkan ke internet untuk menghubungkan ke Google Drive.')
      }
      throw err
    }
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
          { properties: { title: GoogleSheetsRepository.SYNC_SHEET_TITLE, hidden: true } },
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

    // Structured snapshot payload for multi-device sync
    const syncSnapshot = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      transactions,
      categories,
      wallets,
      budgets,
    }
    const syncJsonString = JSON.stringify(syncSnapshot)

    // 6. Write formatted values + structured snapshot
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
            {
              range: `'${GoogleSheetsRepository.SYNC_SHEET_TITLE}'!A1`,
              values: [[syncJsonString]],
            },
          ],
        }),
      }
    )
    const writeData = await writeRes.json()
    if (writeData.error) this.handleApiError(writeData.error)

    // 7. Format styling (Frozen rows, bold headers, column widths, Rupiah format)
    await this.applySheetStyling(spreadsheetId, totalTxCount, wallets.length, budgets.length)

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
    const hasSyncSheet = existingSheets.some(s => s.title === GoogleSheetsRepository.SYNC_SHEET_TITLE)

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

    if (!hasSyncSheet) {
      requests.push({
        addSheet: {
          properties: {
            title: GoogleSheetsRepository.SYNC_SHEET_TITLE,
            hidden: true,
          },
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
  }

  /**
   * Apply professional header styling, colors, generous column widths, and Rupiah currency format.
   */
  private async applySheetStyling(
    spreadsheetId: string,
    totalTxCount: number,
    walletCount: number,
    budgetCount: number
  ): Promise<void> {
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

      // Currency pattern: e.g. Rp 200,000 / -Rp 200,000 / Rp 0
      const rupiahFormat = {
        type: 'CURRENCY',
        pattern: '"Rp "#,##0;("-Rp "#,##0);"Rp "0',
      }

      if (txSheet) {
        const sheetId = txSheet.properties.sheetId

        // 1. Freeze first 4 rows
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 4 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        })

        // 2. Set generous column widths so no header or text is clipped
        const txColWidths = [
          55,  // A: No
          125, // B: Tanggal
          120, // C: Jenis
          180, // D: Kategori
          190, // E: Dompet / Rekening
          240, // F: Judul / Keterangan
          180, // G: Pemasukan (Rp)
          180, // H: Pengeluaran (Rp)
          250, // I: Catatan Tambahan
        ]
        txColWidths.forEach((pixelSize, idx) => {
          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: idx,
                endIndex: idx + 1,
              },
              properties: { pixelSize },
              fields: 'pixelSize',
            },
          })
        })

        // 3. Header Row (Row 4) height: 38px
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 3,
              endIndex: 4,
            },
            properties: { pixelSize: 38 },
            fields: 'pixelSize',
          },
        })

        // 4. Header Row styling: Royal Blue background, white bold text
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
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        })

        // 5. Title row styling (Row 1)
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

        // 6. Currency format for Pemasukan (Col G / 6) & Pengeluaran (Col H / 7)
        const maxTxRow = Math.max(6, 4 + totalTxCount + 4)
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 4,
              endRowIndex: maxTxRow,
              startColumnIndex: 6,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: rupiahFormat,
                horizontalAlignment: 'RIGHT',
              },
            },
            fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
          },
        })

        // 7. Styling for TOTAL and SALDO BERSIH rows
        if (totalTxCount > 0) {
          const totalRowIdx = 4 + totalTxCount + 1
          // TOTAL row (light gray, bold)
          requests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: totalRowIdx,
                endRowIndex: totalRowIdx + 1,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
                  textFormat: { bold: true },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          })

          // SALDO BERSIH row (soft blue, bold)
          requests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: totalRowIdx + 1,
                endRowIndex: totalRowIdx + 2,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.91, green: 0.95, blue: 1.0 },
                  textFormat: { bold: true },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          })
        }
      }

      if (summarySheet) {
        const sheetId = summarySheet.properties.sheetId

        // 1. Freeze first 4 rows
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 4 },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        })

        // 2. Set column widths for summary
        const summaryColWidths = [
          220, // A: Nama Dompet / Rekening
          130, // B: Tipe
          190, // C: Saldo Saat Ini (Rp)
          110, // D: Mata Uang
          190, // E: Status
        ]
        summaryColWidths.forEach((pixelSize, idx) => {
          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: idx,
                endIndex: idx + 1,
              },
              properties: { pixelSize },
              fields: 'pixelSize',
            },
          })
        })

        // 3. Header row height: 38px
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 3,
              endIndex: 4,
            },
            properties: { pixelSize: 38 },
            fields: 'pixelSize',
          },
        })

        // 4. Header Row styling: Emerald Green background
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
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
          },
        })

        // 5. Format wallet balances as Rupiah (Col C / 2)
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 4,
              endRowIndex: Math.max(5, 4 + walletCount + 2),
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: rupiahFormat,
                horizontalAlignment: 'RIGHT',
              },
            },
            fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
          },
        })

        // 6. Format budgets as Rupiah if budgets exist
        if (budgetCount > 0) {
          const budgetStartRow = 4 + walletCount + 4
          requests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: budgetStartRow,
                endRowIndex: budgetStartRow + budgetCount + 1,
                startColumnIndex: 1,
                endColumnIndex: 4,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: rupiahFormat,
                  horizontalAlignment: 'RIGHT',
                },
              },
              fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
            },
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
    } catch (stylingErr) {
      console.warn('[GoogleSheetsRepository] Styling batchUpdate warning:', stylingErr)
    }
  }

  /**
   * Pull structured snapshot data from Google Sheets and load it into local Dexie database.
   * Useful when user logs in on a new device (PC / mobile) or forces a restore.
   */
  async pullFromDrive(targetSpreadsheetId?: string): Promise<{ success: boolean; message: string; recordCount?: number }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        message: 'Perangkat sedang offline. Sambungkan ke koneksi internet untuk menarik data dari Google Drive.',
      }
    }

    try {
      const spreadsheetId = targetSpreadsheetId || (await this.getOrCreateSpreadsheet())

      const readRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${GoogleSheetsRepository.SYNC_SHEET_TITLE}'!A1`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      )
      const readData = await readRes.json()
      if (readData.error) {
        // Tab might not exist yet if created prior to this feature
        return { success: false, message: 'Lembar sinkronisasi belum tersedia di spreadsheet ini.' }
      }

      const rawJson = readData.values?.[0]?.[0]
      if (!rawJson) {
        return { success: false, message: 'Tidak ada data snapshot di Google Drive.' }
      }

      const snapshot = JSON.parse(rawJson)
      const { transactions = [], categories = [], wallets = [], budgets = [] } = snapshot

      // Insert/merge into local Dexie IndexedDB
      await db.transaction('rw', [db.transactions, db.categories, db.wallets, db.budgets], async () => {
        if (categories.length > 0) {
          await db.categories.bulkPut(categories)
        }
        if (wallets.length > 0) {
          await db.wallets.bulkPut(wallets)
        }
        if (budgets.length > 0) {
          await db.budgets.bulkPut(budgets)
        }
        if (transactions.length > 0) {
          await db.transactions.bulkPut(transactions)
        }
      })

      const totalCount = transactions.length + categories.length + wallets.length + budgets.length
      return {
        success: true,
        message: `Berhasil menarik ${transactions.length} transaksi & ${wallets.length} dompet dari Google Drive!`,
        recordCount: totalCount,
      }
    } catch (err: any) {
      console.error('[GoogleSheetsRepository.pullFromDrive] Error:', err)
      return { success: false, message: formatSyncError(err, 'pull') }
    }
  }

  /**
   * Alias for syncFullFinancialReport: writes human-readable sheets + JSON sync snapshot.
   */
  async pushToDrive(targetSpreadsheetId?: string): Promise<string> {
    return this.syncFullFinancialReport(targetSpreadsheetId)
  }

  /**
   * Smart bidirectional sync:
   * - If local database has no transactions, checks Drive to pull snapshot.
   * - Otherwise, pushes local state to Drive.
   */
  async syncTwoWay(targetSpreadsheetId?: string): Promise<{ action: 'pulled' | 'pushed'; message: string; spreadsheetId: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Perangkat sedang offline. Sambungkan ke koneksi internet untuk melakukan sinkronisasi dengan Google Drive.')
    }

    try {
      const spreadsheetId = targetSpreadsheetId || (await this.getOrCreateSpreadsheet())
      const localTxCount = await db.transactions.count()

      if (localTxCount === 0) {
        // Local is empty (e.g. freshly opened device) -> attempt pull
        const pullResult = await this.pullFromDrive(spreadsheetId)
        if (pullResult.success && pullResult.recordCount && pullResult.recordCount > 0) {
          return { action: 'pulled', message: pullResult.message, spreadsheetId }
        }
        if (!pullResult.success && isNetworkError(pullResult.message)) {
          throw new Error(pullResult.message)
        }
      }

      // Otherwise push local database state to Drive
      await this.pushToDrive(spreadsheetId)
      return { action: 'pushed', message: 'Data lokal berhasil diunggah ke Google Drive!', spreadsheetId }
    } catch (err: any) {
      if (err?.message === 'Session Expired') throw err
      throw new Error(formatSyncError(err, 'sync'))
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
