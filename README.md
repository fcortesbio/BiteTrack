# **BiteTrack**
BiteTrack is a Dockerized Express.js RESTful API designed to help small food businesses (starting with a sandwich shop), manage sellers, products, customers, and sales. It replaces messy spreadsheets with structured, persistent data stored in MongoDB.

This project is built as a backend-only MBP -- no frontend client planned yet.

---
## **Features (MVP)**
* **RESTful API** built with Express.js and MongoDB (via mongoose)
* **Dockerized deployment** for consistent set up
* **Persistent data models** for Sellers, Pending Sellers, Customers, Products and Sales.
* **Authentication & Authorization** using JWT with role-based access control.
* **Secure** account activation using security questions
* **Transactional sales flow** -- product inventory and sales records update automatically.
* **Middleware** for input validation, logging, password hashing, and rate limiting

---
## **Database Schemas**
### **Sellers**
* Manages active accounts for business operators
* Fields: `firstName`, `lastName`, `email` (unique), `birthDay` (Date), `password` (hashed), `role` (`user` | `admin` | `superadmin`), `createdBy`, `activatedAt`, `updatedAt`.
* Password is excluded form query results by default.
* Roles define previleges:
  * **user**: create/manage products, customers, and sales; self update information: first and lastname, email, birthdate and password (require old password + 1 of email or birthdate)
  * **admin**: create/manage products, customers, and sales; create pending Seller accounts; self update information: first and lastname, email, birthdate and password (require old password + 1 of email or birthdate)
  * **superadmin**: create/manage products, customers, and sales; create pending Seller accounts; promote/demote roles, allow password reset (if a Seller forgets their password); self update information: first and lastname, email, birthdate and password (require old password + 1 of email or birthdate).

### **Pending sellers**
* Stores pre-activation user accounts
* Fields: `firstName`, `lastName`, `email` (unique), `birthDay`, `createdAt`, `createdBy`, `activatedAt` (added once account is activated).
* Activated by completing security questions (email, birth date, last name) and setting a valid password.
* Activated accounts are promoted to the `user` role by default.

### **Customers**
* Stores customer contact information (no login access)
* Fields: `firstName`, `lastName`, `phoneNumber`, `email`, `createdAt`, `updatedAt`, `lastTransaction`.
* Used only for sales tracking, not a app role.
* `email` is optional but unique+sparse (multiple customers can exist without email, but emails must be unique if present).

### **Products**
* Stores catalog of items sold.
* Fields: `productName`, `description` (optional), `count` (inventory), `price`.

### **Sales**
* Multi-product transactions linking to a `customerId`.
* Each sale contains `products[]` (with `productId` (referencing a product from `Products`), `quantity`, `priceAtSale`).
* Tracks `totalAmount`, `amountPaid`, and `settled` (true if fully paid).
* References `sellerId` for the operator who made the sale.
* Transaction ensures atomicity: sales is only saved if all product stock updates succeed.

## **Authentication/Authorization**
* **JWT-based authentication** for all Sellers.
* **Signup flow**:
  * Only admins/superadmins can create a pending seller accounts
  * Sellers self-activate by providing **email**, **date of birth**, and **last name** + setting a secure password.
  * Activated sellers default to role `user`
* **Role management**:
  * Only **superadmin** can promote `user ==> admin`.
  * Only **superadmin** can enable password recovery for a Seller account when needed.
  * Only **superadmin** and **admin** can create a pending account
* **Account Recovery**:
  * If password forgotten, a superadmin can enable a new endpoint by creating a temporary password reset token. A password reset request must include a valid reset token, the user’s email, date of birth, and a new password.

---
## **Installation**
### **Prerequisites**
* [Docker](https://www.docker.com/)
* [Docker Compose](https://docs.docker.com/compose/)

### **Steps**

```bash
# Clone repo
git clone https://github.com/fcortesbio/BiteTrack
cd BiteTrack

# Start containers
docker-compose up --build
```
The API will be available at https://localhost:3000
---
### **Roadmap**
* Add frontend client (React/Vue/Angular)
* Add reporting endpoints (weekly sales, unsettled accounts, top products).
* Add MCP server layer for AI-assisted queries.
* Add unit/integration tests.

## Notes
* Customers have no direct API access or an active application role
* Sales are atomic --either all related operations succceed, or the transaction is rolled back.
* inventory decrements automatically when sales are completed.

## License
MIT License
