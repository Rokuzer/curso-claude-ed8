import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Bill, BillRequest, PointsBalance, PointsRule } from '../models/bill.model'

@Injectable({ providedIn: 'root' })
export class BillService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  requestBill(orderId: string, request: BillRequest): Observable<Bill> {
    return this.http.post<Bill>(`${this.apiUrl}/orders/${orderId}/bill`, request)
  }

  getBill(orderId: string): Observable<Bill> {
    return this.http.get<Bill>(`${this.apiUrl}/orders/${orderId}/bill`)
  }

  getPointsRules(restaurantId: string): Observable<PointsRule[]> {
    return this.http.get<PointsRule[]>(`${this.apiUrl}/restaurants/${restaurantId}/points-rules`)
  }

  getMyPoints(restaurantId: string): Observable<PointsBalance> {
    return this.http.get<PointsBalance>(`${this.apiUrl}/restaurants/${restaurantId}/points/me`)
  }
}
