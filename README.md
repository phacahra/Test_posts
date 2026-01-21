# Social Media Post Manager (Facebook & Instagram)

โปรเจกต์นี้เป็นระบบจัดการโพสต์โซเชียลมีเดีย (Facebook Page และ Instagram) ผ่านหน้าเว็บอย่างง่าย โดยใช้ Node.js เป็น Backend และ React เป็น Frontend

---

## 1. Internal Backend API (Node.js)
API ที่ถูกสร้างขึ้นในโปรเจกต์นี้ (`backend/index.js`) เพื่อให้ Frontend เรียกใช้งาน

| Method | Endpoint | Description | Body / Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/info` | ดึงข้อมูลเพจ Facebook (ชื่อ, รูปโปรไฟล์) และบัญชี Instagram | - |
| **GET** | `/api/posts` | ดึงประวัติการโพสต์ที่บันทึกไว้ใน Database (ไฟล์ `posts.json`) | - |
| **POST** | `/api/post` | สร้างโพสต์ใหม่ (อัปโหลดรูป + ข้อความ) ไปยัง FB และ IG | `form-data`: `title`, `content`, `category`, `short_description`, `images` (files) |

---

## 2. Facebook Graph API
API ของ Facebook ที่ระบบนี้เรียกใช้งานจริง และ API อื่นๆ ที่น่าสนใจสำหรับการพัฒนาต่อยอด

### 2.1 ที่ใช้งานใน Code ปัจจุบัน (`backend/index.js`)
ระบบใช้ Graph API v19.0

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/{page-id}?fields=name,picture` | ดึงชื่อและรูปโปรไฟล์ของเพจ |
| **POST** | `/{page-id}/photos` | อัปโหลดรูปภาพไปยังอัลบั้มของเพจ (ตั้งค่า `published=false` เพื่อรอโพสต์รวม) |
| **GET** | `/{photo-id}?fields=images` | ดึง URL ของรูปภาพที่อัปโหลดไปแล้ว (เพื่อนำไปใช้โพสต์ Feed) |
| **POST** | `/{page-id}/feed` | สร้างโพสต์บนหน้าเพจ (Feed) พร้อมข้อความและรูปภาพที่อัปโหลดไว้ |

### 2.2 API อื่นๆ ที่แนะนำ (ยังไม่มีใน Code)
หากต้องการเพิ่มฟีเจอร์ สามารถใช้ API เหล่านี้ได้:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/me/accounts` | ดึงรายชื่อเพจที่ผู้ใช้ดูแลอยู่ (ใช้หา Page ID และ Access Token) |
| **GET** | `/{page-id}/feed` | ดึงรายการโพสต์หน้าเพจ Facebook มาแสดง (Feed) |
| **GET** | `/{post-id}/comments` | ดึงคอมเมนต์ของโพสต์ |
| **GET** | `/{post-id}/insights` | ดูสถิติของโพสต์ (ยอดวิว, ยอดไลก์, การเข้าถึง) |
| **DELETE** | `/{post-id}` | ลบโพสต์ออกจากเพจ |

---

## 3. Instagram API
ระบบนี้ใช้ **Instagram Private API** (จำลองการทำงานเหมือนแอปมือถือ) แทน Official Graph API เพื่อความสะดวกในการโพสต์รูปหลายรูป (Carousel) ได้ง่ายกว่า

### 3.1 ที่ใช้งานใน Code ปัจจุบัน (`backend/instagram.js`)
ใช้งานผ่าน library `instagram-private-api`

| Function | Description |
| :--- | :--- |
| `ig.account.login` | ล็อกอินเข้าสู่ระบบ Instagram |
| `ig.publish.photo` | โพสต์รูปภาพเดี่ยว |
| `ig.publish.album` | โพสต์รูปภาพหลายรูป (Carousel/Album) |

### 3.2 Instagram Graph API (Official - ทางเลือกอื่น)
หากต้องการเปลี่ยนไปใช้ Official API ของ Meta (ต้องใช้บัญชี Business/Creator และเชื่อมกับ FB Page):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/{ig-user-id}` | ดึงข้อมูลบัญชี Instagram Business |
| **GET** | `/{ig-user-id}/media` | ดึงรายการโพสต์ Instagram |
| **POST** | `/{ig-user-id}/media` | สร้าง Container สำหรับรูปภาพ/วิดีโอ (Step 1) |
| **POST** | `/{ig-user-id}/media_publish` | สั่งโพสต์ Container ที่สร้างไว้ (Step 2) |
| **GET** | `/{media-id}/comments` | ดึงคอมเมนต์ |
| **GET** | `/{media-id}/insights` | ดูสถิติของโพสต์ IG |

---

**หมายเหตุ:**
- `{page-id}` คือ ID ของเพจ Facebook
- `{post-id}` คือ ID ของโพสต์