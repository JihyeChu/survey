# Survey — 설문 폼 빌더 & 응답 수집 시스템

Google Forms와 유사한 설문 폼을 직접 생성·배포하고, 응답을 수집·분석할 수 있는 풀스택 웹 애플리케이션입니다.
Spring Boot 백엔드와 Vanilla JS 프론트엔드로 구성되며, 별도의 배포 없이 단일 서버에서 동작합니다.

---

## 목차

1. [주요 기능](#주요-기능)
2. [기술 스택](#기술-스택)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [프로젝트 구조](#프로젝트-구조)
5. [도메인 모델 & ERD](#도메인-모델--erd)
6. [API 엔드포인트](#api-엔드포인트)
7. [프론트엔드 구조](#프론트엔드-구조)
8. [환경 설정](#환경-설정)
9. [실행 방법](#실행-방법)
10. [테스트](#테스트)
11. [주요 비즈니스 로직](#주요-비즈니스-로직)
12. [파일 업로드](#파일-업로드)
13. [데이터 내보내기](#데이터-내보내기)

---

## 주요 기능

### 폼 빌더 (관리자)
- **폼 생성 / 수정 / 삭제** — 제목, 설명, 설문 기간(시작·종료 시각) 설정
- **질문 유형** — 단답형(`short-text`), 객관식(`multiple-choice`), 체크박스(`checkbox`), 드롭다운(`dropdown`)
- **섹션(Section)** — 질문을 그룹으로 묶어 여러 페이지로 구성
- **질문 순서 변경** — 드래그 앤 드롭으로 섹션 간 이동 포함
- **질문 첨부파일** — 질문에 이미지/PDF 등 참고 자료 첨부 (최대 10MB)
- **폼 설정** — 이메일 수집 여부, 응답 수정 허용 여부 등 JSON 기반 설정
- **초안(Draft) 자동 저장** — 게시 전 작업 내용을 localStorage에 자동 저장

### 응답 수집 (응답자)
- **설문 기간 제한** — 시작 전 / 종료 후 접근 차단 및 안내 메시지 표시
- **제출 시점 기간 재검증** — 페이지 열람 중 설문이 종료되어도 제출 시 알림
- **이메일 수집** — 설정에 따라 응답자 이메일 선택적 수집
- **응답 수정** — 설정 활성화 시 제출 후 본인 응답 수정 가능
- **파일 첨부** — 응답자가 파일을 첨부하여 제출 (임시 저장 후 제출 시 연결)
- **섹션별 다중 페이지** — 이전/다음 버튼으로 섹션 이동, 섹션별 유효성 검사

### 응답 관리 (관리자)
- **응답 목록 테이블** — 제출 시각, 이메일, 각 질문별 답변 표 형태 조회
- **응답 통계** — 객관식·체크박스 바 차트, 단답형 응답 리스트 (미응답 포함)
- **요약 카드** — 총 응답 수, 완료율, 최근 제출 시각
- **Excel / CSV 내보내기** — 설문 제목 포함, 질문별 컬럼 구조로 저장

---

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| Language | Java | 17 |
| Framework | Spring Boot | 3.4.1 |
| ORM | Spring Data JPA (Hibernate) | — |
| Database (운영) | MySQL | 8.x |
| Database (테스트) | H2 In-memory | — |
| Build | Gradle | 9.x |
| 환경변수 | spring-dotenv | 4.0.0 |
| 코드 간소화 | Lombok | — |
| 프론트엔드 | Vanilla JS + HTML + CSS | — |
| Excel 내보내기 | SheetJS (XLSX) | CDN |
| 테스트 | JUnit 5 + Spring Boot Test | — |

---

## 시스템 아키텍처

```
브라우저
  │
  ├─ GET  /              → index.html  (폼 빌더 — 관리자)
  ├─ GET  /respond.html  → respond.html (설문 응답 — 응답자)
  │
  └─ /api/**  → Spring Boot REST API
                  │
                  ├─ FormController       (/api/forms)
                  ├─ ResponseController   (/api/forms/{id}/responses)
                  ├─ SectionController    (/api/forms/{id}/sections)
                  ├─ FileUploadController (/api/files, /api/responses/.../files)
                  ├─ PublicFormController (/api/forms/{id}/public)
                  └─ AdminController      (/api/admin)
                  │
                  ├─ Service Layer (비즈니스 로직)
                  ├─ Repository Layer (Spring Data JPA)
                  └─ MySQL DB

로컬 파일 시스템 (uploads/)
  └─ 업로드된 첨부파일 저장
```

프론트엔드는 Spring Boot의 `static` 리소스로 제공되므로 **별도 웹 서버 불필요**합니다.

---

## 프로젝트 구조

```
Survey/
├── backend/
│   ├── .env                          # 환경변수 (gitignore 대상)
│   ├── .env.example                  # 환경변수 템플릿
│   ├── build.gradle                  # Gradle 의존성 설정
│   ├── uploads/                      # 업로드 파일 저장 디렉토리 (런타임 생성)
│   └── src/
│       ├── main/
│       │   ├── java/com/survey/
│       │   │   ├── SurveyApplication.java           # 진입점
│       │   │   ├── config/
│       │   │   │   └── JacksonConfig.java           # ObjectMapper 설정
│       │   │   ├── controller/
│       │   │   │   ├── AdminController.java         # DB 초기화 (개발 전용)
│       │   │   │   ├── FileUploadController.java    # 응답자 파일 업로드/다운로드
│       │   │   │   ├── FormController.java          # 폼 CRUD + 질문 관리 + 첨부파일
│       │   │   │   ├── PublicFormController.java    # 응답자용 공개 폼 조회
│       │   │   │   ├── ResponseController.java      # 응답 제출/조회/수정
│       │   │   │   └── SectionController.java       # 섹션 CRUD
│       │   │   ├── dto/
│       │   │   │   ├── FileMetadataResponse.java    # 파일 메타데이터 응답 DTO
│       │   │   │   ├── FormRequest.java             # 폼 생성/수정 요청 DTO
│       │   │   │   ├── FormResponse.java            # 폼 응답 DTO (관리자용)
│       │   │   │   ├── PublicFormResponse.java      # 폼 응답 DTO (응답자용, 정답 미노출)
│       │   │   │   ├── PublicQuestionResponse.java  # 질문 응답 DTO (응답자용)
│       │   │   │   ├── PublicSectionResponse.java   # 섹션 응답 DTO (응답자용)
│       │   │   │   ├── QuestionRequest.java         # 질문 생성/수정 요청 DTO
│       │   │   │   ├── QuestionResponse.java        # 질문 응답 DTO (관리자용)
│       │   │   │   ├── ReorderQuestionsRequest.java # 질문 순서 변경 요청 DTO
│       │   │   │   ├── ResponseDto.java             # 응답 조회 DTO
│       │   │   │   ├── ResponseRequest.java         # 응답 제출 요청 DTO
│       │   │   │   ├── SectionRequest.java          # 섹션 생성/수정 요청 DTO
│       │   │   │   └── SectionResponse.java         # 섹션 응답 DTO
│       │   │   ├── entity/
│       │   │   │   ├── Answer.java                  # 질문별 답변 엔티티
│       │   │   │   ├── FileMetadata.java            # 업로드 파일 메타데이터 엔티티
│       │   │   │   ├── Form.java                    # 설문 폼 엔티티
│       │   │   │   ├── Question.java                # 질문 엔티티
│       │   │   │   ├── Response.java                # 응답자 제출 응답 엔티티
│       │   │   │   └── Section.java                 # 섹션 엔티티
│       │   │   ├── exception/
│       │   │   │   └── GlobalExceptionHandler.java  # 전역 예외 처리 핸들러
│       │   │   ├── repository/
│       │   │   │   ├── AnswerRepository.java
│       │   │   │   ├── FileMetadataRepository.java
│       │   │   │   ├── FormRepository.java          # JPQL 수정 쿼리 포함
│       │   │   │   ├── QuestionRepository.java
│       │   │   │   ├── ResponseRepository.java
│       │   │   │   └── SectionRepository.java
│       │   │   └── service/
│       │   │       ├── AdminService.java            # DB 초기화 서비스
│       │   │       ├── FileStorageService.java      # 로컬 파일 저장/삭제/읽기
│       │   │       ├── FileUploadService.java       # 파일 업로드 비즈니스 로직
│       │   │       ├── FormService.java             # 폼 CRUD 비즈니스 로직
│       │   │       ├── PublicFormService.java       # 응답자용 공개 폼 조회
│       │   │       ├── QuestionService.java         # 질문 CRUD + 첨부파일 관리
│       │   │       ├── ResponseService.java         # 응답 제출/조회/수정
│       │   │       └── SectionService.java          # 섹션 CRUD
│       │   └── resources/
│       │       ├── application.yml                  # 운영 설정
│       │       └── static/                          # 내장 프론트엔드 (Spring 정적 자원)
│       │           ├── index.html                   # 폼 빌더 페이지 (관리자)
│       │           ├── respond.html                 # 설문 응답 페이지 (응답자)
│       │           ├── css/
│       │           │   ├── styles.css               # 빌더 페이지 스타일
│       │           │   └── respond.css              # 응답자 페이지 스타일
│       │           └── js/
│       │               ├── api.js                   # API 통신 + PersistenceManager
│       │               ├── app.js                   # 빌더 페이지 전체 로직
│       │               └── respond.js               # 응답자 페이지 전체 로직
│       └── test/
│           ├── java/com/survey/
│           │   ├── controller/
│           │   │   ├── FileUploadControllerTest.java  (12개 테스트)
│           │   │   ├── FormControllerTest.java        (10개 테스트)
│           │   │   └── ResponseControllerTest.java    (6개 테스트)
│           │   └── service/
│           │       ├── FormServiceTest.java           (8개 테스트)
│           │       ├── QuestionServiceTest.java       (14개 테스트)
│           │       ├── ResponseServiceTest.java       (7개 테스트)
│           │       └── SectionServiceTest.java        (12개 테스트)
│           └── resources/
│               └── application.yml                  # 테스트용 H2 설정
└── docs/                                            # 설계 문서
```

---

## 도메인 모델 & ERD

### 관계 구조

```
Form (설문 폼)
 ├── id: Long (PK, AUTO_INCREMENT)
 ├── title: String (NOT NULL)
 ├── description: TEXT
 ├── settings: JSON          ← collectEmail, allowResponseEdit 등 설정 값
 ├── startAt: LocalDateTime  ← 설문 시작 시각 (null = 제한 없음)
 ├── endAt: LocalDateTime    ← 설문 종료 시각 (null = 제한 없음)
 ├── createdAt, updatedAt
 │
 ├── Section[] (섹션, orderIndex ASC 정렬)
 │    ├── id, title, description, orderIndex
 │    └── Question[] (섹션 소속 질문, orderIndex ASC 정렬)
 │
 ├── Question[] (섹션 없는 루트 질문, orderIndex ASC 정렬)
 │    ├── id, type, title, description, required, orderIndex
 │    ├── config: JSON       ← 선택지 목록 { options: [{id, label}] } 등
 │    ├── attachmentFilename, attachmentStoredName, attachmentContentType
 │    └── FileMetadata[]     ← 응답자가 업로드한 파일
 │
 └── Response[] (응답자 제출)
      ├── id, email, submittedAt
      ├── Answer[]           ← 질문별 답변
      │    ├── questionId: Long
      │    └── value: String (JSON — 텍스트 또는 배열)
      └── FileMetadata[]     ← 응답 첨부 파일
           ├── id, originalFilename, storedFilename, contentType, fileSize
           ├── response_id (FK → response)
           └── question_id (FK → question)
```

### 엔티티 연관관계 요약

| 엔티티 | 관계 | 대상 엔티티 |
|--------|------|-------------|
| Form | 1:N | Section, Question, Response |
| Section | N:1 | Form |
| Section | 1:N | Question |
| Question | N:1 | Form, Section (nullable) |
| Question | 1:N | FileMetadata |
| Response | N:1 | Form |
| Response | 1:N | Answer, FileMetadata |
| Answer | N:1 | Response |
| FileMetadata | N:1 | Response, Question |

---

## API 엔드포인트

### 공통 사항

- **Base URL**: `http://localhost:8080/api`
- **Content-Type**: `application/json` (파일 업로드는 `multipart/form-data`)
- **에러 응답 형식**:
  ```json
  {
    "timestamp": "2026-02-26T09:00:00",
    "status": 400,
    "error": "Bad Request",
    "message": "에러 메시지"
  }
  ```

| HTTP 상태 | 설명 |
|-----------|------|
| 200 OK | 조회/수정 성공 |
| 201 Created | 생성 성공 |
| 204 No Content | 삭제 성공 |
| 400 Bad Request | 유효하지 않은 요청 (지원하지 않는 질문 유형 등) |
| 403 Forbidden | 설문 기간 외 제출, 응답 수정 비허용 |
| 404 Not Found | 리소스 없음 |

---

### 폼 관리 `/api/forms`

#### 폼 생성
```
POST /api/forms
Content-Type: application/json
```

**Request Body**
```json
{
  "title": "고객 만족도 설문",
  "description": "서비스 이용 경험을 알려주세요.",
  "settings": {
    "collectEmail": true,
    "allowResponseEdit": false
  },
  "startAt": "2026-03-01T09:00:00",
  "endAt": "2026-03-31T23:59:59",
  "sections": [
    {
      "title": "기본 정보",
      "description": "응답자 기본 정보",
      "orderIndex": 0,
      "questions": [
        {
          "type": "short-text",
          "title": "이름을 입력해주세요",
          "required": true,
          "orderIndex": 0
        }
      ]
    }
  ],
  "questions": []
}
```

> `sections`와 `questions`는 중 하나만 사용합니다.
> 섹션 구조를 사용하면 `sections[].questions`에 질문을 포함하고, `questions`는 빈 배열로 보냅니다.

**Response** `201 Created`
```json
{
  "id": 1,
  "title": "고객 만족도 설문",
  "description": "...",
  "settings": "{\"collectEmail\":true,\"allowResponseEdit\":false}",
  "startAt": "2026-03-01T09:00:00",
  "endAt": "2026-03-31T23:59:59",
  "createdAt": "2026-02-26T09:00:00",
  "updatedAt": "2026-02-26T09:00:00",
  "sections": [ { "id": 1, "title": "기본 정보", "questions": [...] } ],
  "questions": []
}
```

---

#### 전체 폼 목록 조회
```
GET /api/forms
```
**Response** `200 OK` — `FormResponse[]`

---

#### 폼 단건 조회
```
GET /api/forms/{id}
```
**Response** `200 OK` — `FormResponse`

---

#### 폼 수정
```
PUT /api/forms/{id}
Content-Type: application/json
```
Request Body는 폼 생성과 동일합니다.
> 기존 섹션·질문을 모두 삭제하고 요청 데이터로 재생성합니다.

**Response** `200 OK` — `FormResponse`

---

#### 폼 삭제
```
DELETE /api/forms/{id}
```
> 연관된 질문, 섹션, 응답, 첨부파일(디스크 포함)이 모두 삭제됩니다.

**Response** `204 No Content`

---

#### 응답자용 공개 폼 조회
```
GET /api/forms/{id}/public
```
> 응답자 페이지에서 사용합니다. 설정 등 민감 정보를 제외하고 반환합니다.

**Response** `200 OK` — `PublicFormResponse`

---

### 질문 관리 `/api/forms/{formId}/questions`

#### 질문 추가
```
POST /api/forms/{formId}/questions
Content-Type: application/json
```

**Request Body**
```json
{
  "type": "multiple-choice",
  "title": "만족도를 선택해주세요",
  "description": "해당 항목을 선택하세요",
  "required": true,
  "orderIndex": 1,
  "config": {
    "options": [
      { "id": "opt_0", "label": "매우 만족" },
      { "id": "opt_1", "label": "만족" },
      { "id": "opt_2", "label": "보통" },
      { "id": "opt_3", "label": "불만족" }
    ]
  }
}
```

**지원하는 질문 유형**

| type | 설명 | config 구조 |
|------|------|-------------|
| `short-text` | 단답형 텍스트 | 없음 |
| `multiple-choice` | 객관식 (단일 선택) | `{ options: [{id, label}] }` |
| `checkbox` | 체크박스 (복수 선택) | `{ options: [{id, label}] }` |
| `dropdown` | 드롭다운 선택 | `{ options: [{id, label}] }` |

> `file-upload`, `linear-scale`, `date` 유형은 현재 미지원 (400 오류 반환)

**Response** `201 Created` — `QuestionResponse`

---

#### 질문 조회
```
GET /api/forms/{formId}/questions/{questionId}
```
**Response** `200 OK` — `QuestionResponse`

---

#### 질문 수정
```
PUT /api/forms/{formId}/questions/{questionId}
Content-Type: application/json
```
Request Body는 질문 추가와 동일합니다.

**Response** `200 OK` — `QuestionResponse`

---

#### 질문 삭제
```
DELETE /api/forms/{formId}/questions/{questionId}
```
**Response** `204 No Content`

---

#### 질문 순서 변경
```
PUT /api/forms/{formId}/questions/reorder
Content-Type: application/json
```

**Request Body**
```json
{
  "questions": [
    { "questionId": 3, "orderIndex": 0, "sectionId": null },
    { "questionId": 1, "orderIndex": 1, "sectionId": 2 },
    { "questionId": 2, "orderIndex": 2, "sectionId": 2 }
  ]
}
```
> `sectionId`를 변경하면 섹션 간 이동이 가능합니다.

**Response** `200 OK`

---

#### 질문 첨부파일 업로드
```
POST /api/forms/{formId}/questions/{questionId}/attachment
Content-Type: multipart/form-data
```

| Parameter | 타입 | 설명 |
|-----------|------|------|
| `file` | MultipartFile | 업로드할 파일 (최대 10MB) |

> 이미지 파일은 응답자 화면에서 인라인 미리보기로 표시됩니다.
> 기존 첨부파일이 있으면 디스크에서 삭제 후 교체됩니다.

**Response** `201 Created` — `QuestionResponse` (attachmentFilename, attachmentStoredName, attachmentContentType 포함)

---

#### 질문 첨부파일 다운로드
```
GET /api/forms/{formId}/questions/{questionId}/attachment
```
> 이미지인 경우 `Content-Disposition: inline` (브라우저 미리보기)
> 그 외는 `Content-Disposition: attachment` (다운로드)

**Response** `200 OK` — 파일 바이너리

---

#### 질문 첨부파일 삭제
```
DELETE /api/forms/{formId}/questions/{questionId}/attachment
```
**Response** `200 OK` — `QuestionResponse`

---

### 섹션 관리 `/api/forms/{formId}/sections`

#### 섹션 생성
```
POST /api/forms/{formId}/sections
Content-Type: application/json
```

**Request Body**
```json
{
  "title": "2페이지 — 추가 정보",
  "description": "추가 설문 항목입니다.",
  "orderIndex": 1
}
```
**Response** `201 Created` — `SectionResponse`

---

#### 섹션 목록 조회
```
GET /api/forms/{formId}/sections
```
**Response** `200 OK` — `SectionResponse[]` (각 섹션에 소속 질문 포함)

---

#### 섹션 단건 조회
```
GET /api/forms/{formId}/sections/{sectionId}
```
**Response** `200 OK` — `SectionResponse`

---

#### 섹션 수정
```
PUT /api/forms/{formId}/sections/{sectionId}
```
**Response** `200 OK` — `SectionResponse`

---

#### 섹션 삭제
```
DELETE /api/forms/{formId}/sections/{sectionId}
```
**Response** `204 No Content`

---

### 응답 관리 `/api/forms/{formId}/responses`

#### 응답 제출
```
POST /api/forms/{formId}/responses
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com",
  "answers": [
    {
      "questionId": 1,
      "value": "홍길동"
    },
    {
      "questionId": 2,
      "value": "매우 만족"
    },
    {
      "questionId": 3,
      "value": ["옵션A", "옵션C"]
    },
    {
      "questionId": 4,
      "value": [{ "id": 5, "originalFilename": "파일.pdf" }]
    }
  ]
}
```

> - `email`은 폼 설정에서 `collectEmail: true`인 경우에만 저장됩니다.
> - `value`는 단일 문자열 또는 JSON 배열(체크박스, 파일)을 지원합니다.
> - 파일 업로드 답변의 경우 `value`에 사전 업로드된 파일의 `id`를 포함합니다.
> - 설문 기간(startAt ~ endAt) 외 제출 시 `403 Forbidden` 반환

**Response** `201 Created` — `ResponseDto`

---

#### 응답 목록 조회
```
GET /api/forms/{formId}/responses
```
**Response** `200 OK` — `ResponseDto[]`

---

#### 응답 단건 조회
```
GET /api/forms/{formId}/responses/{responseId}
```
**Response** `200 OK` — `ResponseDto`

---

#### 응답 수정
```
PUT /api/forms/{formId}/responses/{responseId}
Content-Type: application/json
```
> 폼 설정에서 `allowResponseEdit: true`인 경우에만 허용됩니다.
> 기존 답변을 모두 삭제하고 요청 데이터로 재생성합니다.

**Response** `200 OK` — `ResponseDto`

---

### 파일 관리 `/api/files`, `/api/responses`

#### 임시 파일 업로드 (응답 제출 전)
```
POST /api/files/upload
Content-Type: multipart/form-data
```

| Parameter | 타입 | 설명 |
|-----------|------|------|
| `file` | MultipartFile | 업로드할 파일 |
| `formId` | String | 폼 ID |
| `questionId` | String | 질문 ID |

> 응답 제출 전 파일을 먼저 서버에 임시 저장합니다.
> 응답 제출 시 `responseId`가 연결되어 정식 저장됩니다.

**Response** `201 Created`
```json
{
  "id": 10,
  "originalFilename": "증빙서류.pdf",
  "storedFilename": "abc123-증빙서류.pdf",
  "contentType": "application/pdf",
  "fileSize": 204800
}
```

---

#### 파일 다운로드
```
GET /api/files/{fileMetadataId}
```
**Response** `200 OK` — 파일 바이너리

#### 파일 메타데이터 조회
```
GET /api/files/{fileMetadataId}/metadata
```
**Response** `200 OK` — `FileMetadataResponse`

#### 응답별 파일 목록
```
GET /api/responses/{responseId}/files
```
**Response** `200 OK` — `FileMetadataResponse[]`

#### 질문별 파일 목록
```
GET /api/questions/{questionId}/files
```
**Response** `200 OK` — `FileMetadataResponse[]`

#### 파일 삭제
```
DELETE /api/files/{fileMetadataId}
```
**Response** `204 No Content`

---

### 관리자 API

#### DB 전체 초기화 (개발 전용)
```
DELETE /api/admin/reset
```
> **주의**: 모든 폼, 질문, 응답, 파일 데이터가 삭제됩니다.
> 운영 환경에서는 절대 사용하지 마세요.

**Response** `200 OK`

---

## 프론트엔드 구조

### 페이지 구성

| URL | 파일 | 역할 |
|-----|------|------|
| `/` | `index.html` | 폼 빌더 & 응답 관리 (관리자) |
| `/respond.html?formId={id}` | `respond.html` | 설문 응답 (응답자) |

---

### 빌더 페이지 (`index.html` + `app.js`)

**탭 구조**

```
[폼 편집] [응답 보기]
```

**폼 편집 탭 주요 기능**
- 폼 제목/설명/기간 편집
- 섹션 추가/삭제
- 질문 추가 (유형 선택 → 제목/선택지 편집)
- 질문 드래그 앤 드롭 순서 변경
- 질문 첨부파일 업로드/미리보기/삭제
- 폼 설정 패널 (이메일 수집, 응답 수정 허용)
- **초안 자동 저장** — 변경사항을 localStorage에 즉시 저장
- **게시 버튼** — 서버에 저장, URL 복사 기능 제공

**응답 보기 탭 주요 기능**
- 응답 요약 카드 (총 응답 수, 최근 제출)
- 응답 목록 테이블 (응답ID, 제출시각, 질문별 답변)
- 응답 통계 (객관식 바 차트, 단답형 리스트)
- Excel / CSV 내보내기

---

### API 모듈 (`api.js`)

핵심 객체: **`PersistenceManager`**

| 메서드 | 설명 |
|--------|------|
| `publish()` | 폼을 서버에 게시 (Create or Update), 첨부파일 업로드 포함 |
| `load(formId)` | 서버에서 폼 불러와 localStorage에 저장 |
| `_uploadPendingAttachments(form)` | 게시 후 대기 중인 질문 첨부파일 서버 업로드 |
| `_transformFormForServer(form)` | 로컬 폼 → 서버 요청 형식 변환 |
| `_transformFormFromServer(form)` | 서버 응답 → 로컬 폼 형식 변환 |

**pendingAttachment 패턴**
질문에 첨부파일을 추가하면 base64로 인코딩하여 localStorage에 임시 저장합니다.
게시(`publish()`) 시 서버에 실제 업로드하고, 업로드 완료 후 localStorage에서 제거합니다.

---

### 응답자 페이지 (`respond.html` + `respond.js`)

**초기화 흐름**
```
URL 파라미터에서 formId 읽기
  → GET /api/forms/{id}/public
  → 설문 기간 체크 (checkSurveyPeriod)
  → 폼 렌더링 (renderForm)
  → 이벤트 리스너 등록
```

**설문 기간 처리**

| 상태 | 동작 |
|------|------|
| 시작 전 | 질문 숨김, "아직 설문 시작 전입니다" 안내 박스 표시 |
| 진행 중 | 정상 표시, 제출 버튼 활성화 |
| 종료 후 | 질문 숨김, "설문이 종료되었습니다" 안내 박스 표시 |
| 제출 시점 재검증 | 페이지 열람 중 종료되면 제출 클릭 시 alert 표시 |

**섹션 네비게이션**
섹션이 있는 경우 이전/다음 버튼으로 섹션 이동합니다.
다음 섹션 이동 전 현재 섹션의 필수 항목을 검증합니다.

---

## 환경 설정

### 1. 데이터베이스 생성

```sql
CREATE DATABASE google_form_clone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. `.env` 파일 생성

`backend/` 디렉토리에 `.env` 파일을 생성합니다. (`.env.example` 참고)

```env
DB_URL=jdbc:mysql://localhost:3306/google_form_clone
DB_USERNAME=root
DB_PASSWORD=your_password_here
```

### 3. `application.yml` 설정 항목

```yaml
server:
  port: 8080                      # 서버 포트 (기본 8080)

spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update            # 최초 실행 시 테이블 자동 생성
    show-sql: true
  servlet:
    multipart:
      max-file-size: 10MB         # 단일 파일 최대 크기
      max-request-size: 10MB      # 요청 전체 최대 크기

file:
  upload:
    dir: uploads                  # 파일 저장 경로 (backend/ 기준 상대 경로)
    max-size: 10485760            # 10MB (바이트)
```

---

## 실행 방법

### 사전 요구사항

- **Java 17** 이상
- **MySQL 8.x** 실행 중
- `.env` 파일 설정 완료

### 서버 시작

```bash
cd backend
./gradlew bootRun
```

> Windows의 경우: `gradlew.bat bootRun`

서버가 시작되면 아래 URL로 접근합니다.

| 페이지 | URL |
|--------|-----|
| 폼 빌더 (관리자) | http://localhost:8080 |
| 설문 응답 (응답자) | http://localhost:8080/respond.html?formId={id} |

### 첫 실행 시

`ddl-auto: update` 설정으로 MySQL에 테이블이 자동 생성됩니다.
별도의 SQL 스크립트 실행이 필요하지 않습니다.

---

## 테스트

### 테스트 실행

```bash
cd backend
./gradlew test
```

> 테스트는 H2 인메모리 DB를 사용하므로 MySQL 연결 없이 실행됩니다.

### 테스트 결과 확인

```bash
# HTML 리포트
open build/reports/tests/test/index.html

# 요약만 확인
./gradlew test | grep -E "tests|BUILD"
```

### 테스트 현황 (총 69개 — 전체 통과)

| 클래스 | 테스트 수 | 커버 범위 |
|--------|-----------|-----------|
| `FileUploadControllerTest` | 12 | 파일 업로드/다운로드/삭제, 유효성 검사 |
| `FormControllerTest` | 10 | 폼 CRUD, 질문 추가/수정/삭제 |
| `ResponseControllerTest` | 6 | 응답 제출/조회, 존재하지 않는 폼 |
| `FormServiceTest` | 8 | 폼 생성/수정/삭제 비즈니스 로직 |
| `QuestionServiceTest` | 14 | 질문 CRUD, 첨부파일, 순서 변경 |
| `ResponseServiceTest` | 7 | 응답 제출, 기간 검증, 수정 |
| `SectionServiceTest` | 12 | 섹션 CRUD |

---

## 주요 비즈니스 로직

### 폼 수정 (`FormService.updateForm`)

폼 수정 시 기존 질문/섹션을 **전체 삭제 후 재생성**하는 방식을 사용합니다.

```
1. file_metadata 삭제 (question FK 제약 때문에 먼저 삭제)
2. question 삭제
3. section 삭제
4. EntityManager flush/clear (영속성 컨텍스트 초기화)
5. form 업데이트 (JPQL 네이티브 쿼리)
6. 새 section + question 재생성
7. getFormById() 반환
```

### 응답 제출 기간 검증 (`ResponseService.submitResponse`)

```java
LocalDateTime now = LocalDateTime.now();
if (form.getStartAt() != null && now.isBefore(form.getStartAt())) {
    throw new IllegalStateException("설문이 아직 시작되지 않았습니다.");
}
if (form.getEndAt() != null && now.isAfter(form.getEndAt())) {
    throw new IllegalStateException("설문이 종료되었습니다.");
}
```

→ `GlobalExceptionHandler`에서 `403 Forbidden`으로 처리됩니다.

### 첨부파일 serverId 복구 (`PersistenceManager._uploadPendingAttachments`)

게시 후 in-memory 매핑이 실패하여 질문에 `serverId`가 없는 경우:

```
1. FormAPI.get(publishedId) 로 서버에서 최신 폼 조회
2. 서버 질문 flat list 구성 (sections → questions 순서로 펼치기)
3. 로컬 질문 flat list와 위치(index) 기반 매핑
4. serverId 복구 후 업로드 진행
```

### 지원하지 않는 질문 유형 차단

`FormService`에서 폼 생성/수정 시 질문 유형을 검증합니다.

```java
private static final Set<String> DISABLED_QUESTION_TYPES =
    Set.of("file-upload", "linear-scale", "date");
```

→ `UnsupportedOperationException` 발생 → `GlobalExceptionHandler`에서 `400 Bad Request`로 처리

---

## 파일 업로드

### 저장 구조

```
backend/uploads/
└── {UUID}_{원본파일명}    ← storedFilename 형식
```

### 지원 파일 형식

| 분류 | 형식 |
|------|------|
| 이미지 | JPG, PNG, GIF, WEBP, SVG |
| 문서 | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX |
| 기타 | TXT, ZIP |

### 처리 흐름 (응답자 파일 첨부)

```
응답자 파일 선택
  → POST /api/files/upload (임시 저장, responseId 없음)
  → FileMetadata 생성 (response_id = null)
  → 응답 제출 시 responseId 연결
  → FileMetadata.response_id 업데이트
```

---

## 데이터 내보내기

### Excel (.xlsx)

SheetJS 라이브러리를 사용하여 클라이언트 사이드에서 생성합니다.

**파일 구조**
```
행 1: [설문지 제목] (전체 열 병합)
행 2: (빈 줄)
행 3: [응답ID] [이메일] [제출시간] [질문1 제목] [질문2 제목] ...
행 4~: 각 응답 데이터
```

**파일명**: `{설문지 제목}_응답.xlsx`

### CSV

BOM(`\uFEFF`) 포함으로 한글 깨짐 없이 Excel에서 바로 열 수 있습니다.

**파일명**: `{설문지 제목}_응답.csv`

### 응답 통계 (화면)

| 질문 유형 | 표시 방식 |
|-----------|-----------|
| 객관식 / 체크박스 | 선택지별 응답 수 + 비율 바 차트 |
| 단답형 | 전체 응답 리스트 (미응답은 `(미응답)` 표시) |
