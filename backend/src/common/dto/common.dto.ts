// Common DTOs used across modules
export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FilterDto {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
