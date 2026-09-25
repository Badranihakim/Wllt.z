/**
 * Base Repository Interface — Repository Pattern contract.
 * All concrete repositories must implement this interface.
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findAll(): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: ID): Promise<void>
}
