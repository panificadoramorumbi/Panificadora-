# Security Specification: Panificadora Morumbi

## 1. Data Invariants

1. **Identity Integrity**:
   - Resellers can only create orders where `resellerId == request.auth.uid`.
   - Users cannot edit their own profile role or grant themselves administrative privileges.
   - Admin operations (quantity correction, registering resellers, changing prices) require membership in `/admins/{uid}` or authenticated admin email `wiliamedfprofessor@gmail.com`.

2. **Order Immutability & State Locking**:
   - Confirmed orders cannot be deleted or arbitrarily rewritten by resellers.
   - Resellers can only record leftovers (`qtySaltyLeftover`, `qtySweetLeftover`, `status: "aguardando_sobras"` -> `"concluido"`, etc.) for their own orders.
   - Leftovers must never exceed the registered pickup quantities.
   - Quantities can never be negative.
   - Only admins can perform quantity adjustments ("Alterar Quantidade"), which strictly requires logging into `audit_logs`.

3. **Financial Protection**:
   - Only admins can register payments and settlements in `/payments`.
   - Prices applied at the time of order creation (`unitPriceSalty`, `unitPriceSweet`) are immutable on historical orders.
   - Settings `/settings/prices` can only be updated by admins.

## 2. The Dirty Dozen Attack Payloads

1. **Payload 1: Impersonate Reseller Order Creation**
   - Reseller `user_B` sends `create` order with `resellerId: "user_A"`.
   - Expected: PERMISSION_DENIED.

2. **Payload 2: Self-Promotion to Admin**
   - Reseller attempts to `update` `/users/{uid}` with `role: "admin"`.
   - Expected: PERMISSION_DENIED.

3. **Payload 3: Reseller Modifying Pickup Quantity of Confirmed Order**
   - Reseller attempts to `update` `qtySaltyPickup` from `100` to `50` on an existing order.
   - Expected: PERMISSION_DENIED.

4. **Payload 4: Negative Bread Quantities**
   - Reseller attempts to `create` order with `qtySaltyPickup: -20`.
   - Expected: PERMISSION_DENIED.

5. **Payload 5: Leftovers Greater Than Pickup**
   - Reseller attempts to report `qtySaltyLeftover: 120` when `qtySaltyPickup: 100`.
   - Expected: PERMISSION_DENIED.

6. **Payload 6: Reseller Reading Another Reseller's Orders**
   - Reseller `user_B` queries `/orders/{orderId}` belonging to `user_A`.
   - Expected: PERMISSION_DENIED.

7. **Payload 7: Unauthenticated Read/Write**
   - Unauthenticated client attempts to read `/orders` or `/users`.
   - Expected: PERMISSION_DENIED.

8. **Payload 8: Reseller Creating Payment Record Directly**
   - Reseller attempts to add doc in `/payments` to self-credit R$ 500,00.
   - Expected: PERMISSION_DENIED.

9. **Payload 9: Deleting Order Record**
   - Reseller attempts `delete` on `/orders/{orderId}`.
   - Expected: PERMISSION_DENIED.

10. **Payload 10: Modifying Store Bread Prices**
    - Reseller attempts to write `/settings/prices` setting `priceSalty: 0.10`.
    - Expected: PERMISSION_DENIED.

11. **Payload 11: Modifying Audit Logs**
    - Non-admin or reseller attempts to write or delete documents in `/audit_logs`.
    - Expected: PERMISSION_DENIED.

12. **Payload 12: Overwriting Existing Order ID**
    - Malicious write replacing existing confirmed order document with new payload.
    - Expected: PERMISSION_DENIED.
