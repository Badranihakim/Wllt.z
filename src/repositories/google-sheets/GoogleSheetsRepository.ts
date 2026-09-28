import { transactionRepo } from '@/repositories'
import { useAuthStore } from '@/stores'

export class GoogleSheetsRepository {
  private static readonly DB_NAME = 'wllt.z_database'
  private static readonly SPREADSHEET_RANGE = 'Transactions!A1'

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

  static async sync(): Promise<void> {
    const { accessToken, setSpreadsheetId } = useAuthStore.getState()
    if (!accessToken) return

    try {
      const cloudRepo = new GoogleSheetsRepository(accessToken)
      const spreadsheetId = await cloudRepo.getOrCreateSpreadsheet()
      setSpreadsheetId(spreadsheetId)

      const localTxs = await transactionRepo.findBySyncStatus('local_only')
      if (localTxs.length > 0) {
        await cloudRepo.appendTransactions(spreadsheetId, localTxs)
        await transactionRepo.markAsSynced(localTxs.map(t => t.id))
      }
    } catch (err) {
      console.error('[GoogleSheetsRepository.sync] Background sync failed:', err)
    }
  }

  async getOrCreateSpreadsheet(): Promise<string> {
    // 1. Search for existing spreadsheet
    const query = encodeURIComponent(`name='${GoogleSheetsRepository.DB_NAME}' and trashed=false`)
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    const searchData = await searchRes.json()
    if (searchData.error) this.handleApiError(searchData.error)

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }

    // 2. Create if not exists
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: GoogleSheetsRepository.DB_NAME },
        sheets: [
          { properties: { title: 'Transactions' } },
          { properties: { title: 'Categories' } },
          { properties: { title: 'Wallets' } },
          { properties: { title: 'Budgets' } },
          { properties: { title: 'Settings' } },
        ],
      }),
    })
    const createData = await createRes.json()
    if (createData.error) this.handleApiError(createData.error)

    return createData.spreadsheetId
  }

  async appendTransactions(spreadsheetId: string, transactions: any[]): Promise<void> {
    if (transactions.length === 0) return

    const values = transactions.map(t => [
      t.id,
      t.created_at || new Date().toISOString(),
      t.updated_at || new Date().toISOString(),
      t.deleted_at || '',
      t.is_deleted ? 'TRUE' : 'FALSE',
      t.type,
      t.amount,
      t.category,
      t.wallet_id || '',
      t.notes || '',
      t.receipt_url || '',
      t.location || '',
      'synced',
    ])

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${GoogleSheetsRepository.SPREADSHEET_RANGE}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    )
    const data = await res.json()
    if (data.error) this.handleApiError(data.error)
  }
}
