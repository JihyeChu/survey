# Survey

Google Forms 클론 프로젝트입니다.
설문 폼을 생성하고 배포하여 응답을 수집할 수 있는 백엔드 서버입니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| Language | Java 17 |
| Framework | Spring Boot 3.4.1 |
| Database | MySQL |
| ORM | Spring Data JPA (Hibernate) |
| Build | Gradle |
| 테스트 DB | H2 (In-memory) |
| 기타 | Lombok, spring-dotenv |

## 프로젝트 구조

```
Survey/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/survey/
│   │   │   │   ├── SurveyApplication.java
│   │   │   │   ├── config/
│   │   │   │   │   └── JacksonConfig.java              # Jackson ObjectMapper 설정
│   │   │   │   ├── controller/
│   │   │   │   │   ├── AdminController.java            # DB 초기화 (개발용)
│   │   │   │   │   ├── FileUploadController.java       # 파일 업로드/다운로드
│   │   │   │   │   ├── FormController.java             # 폼 CRUD + 질문 관리
│   │   │   │   │   ├── PublicFormController.java       # 응답자용 공개 폼 조회
│   │   │   │   │   ├── ResponseController.java         # 응답 제출 및 조회
│   │   │   │   │   └── SectionController.java          # 섹션 관리
│   │   │   │   ├── dto/
│   │   │   │   │   ├── FileMetadataResponse.java
│   │   │   │   │   ├── FormRequest.java / FormResponse.java
│   │   │   │   │   ├── PublicFormResponse.java         # 응답자용 공개 폼 DTO
│   │   │   │   │   ├── PublicQuestionResponse.java
│   │   │   │   │   ├── PublicSectionResponse.java
│   │   │   │   │   ├── QuestionRequest.java / QuestionResponse.java
│   │   │   │   │   ├── ReorderQuestionsRequest.java    # 질문 순서 변경 요청
│   │   │   │   │   ├── ResponseDto.java / ResponseRequest.java
│   │   │   │   │   └── SectionRequest.java / SectionResponse.java
│   │   │   │   ├── entity/
│   │   │   │   │   ├── Answer.java                     # 질문별 답변
│   │   │   │   │   ├── FileMetadata.java               # 업로드 파일 메타데이터
│   │   │   │   │   ├── Form.java                       # 설문 폼
│   │   │   │   │   ├── Question.java                   # 질문 (타입, 순서, 첨부파일)
│   │   │   │   │   ├── Response.java                   # 응답자 제출 응답
│   │   │   │   │   └── Section.java                    # 섹션 (질문 그룹)
│   │   │   │   ├── exception/
│   │   │   │   │   └── GlobalExceptionHandler.java     # 전역 예외 처리
│   │   │   │   ├── repository/
│   │   │   │   │   ├── AnswerRepository.java
│   │   │   │   │   ├── FileMetadataRepository.java
│   │   │   │   │   ├── FormRepository.java
│   │   │   │   │   ├── QuestionRepository.java
│   │   │   │   │   ├── ResponseRepository.java
│   │   │   │   │   └── SectionRepository.java
│   │   │   │   └── service/
│   │   │   │       ├── AdminService.java
│   │   │   │       ├── FileStorageService.java         # 로컬 파일 저장/삭제
│   │   │   │       ├── FileUploadService.java          # 파일 업로드 비즈니스 로직
│   │   │   │       ├── FormService.java
│   │   │   │       ├── PublicFormService.java
│   │   │   │       ├── QuestionService.java
│   │   │   │       ├── ResponseService.java
│   │   │   │       └── SectionService.java
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── static/                             # 내장 프론트엔드
│   │   │           ├── index.html                      # 폼 관리 페이지 (관리자)
│   │   │           ├── respond.html                    # 설문 응답 페이지
│   │   │           ├── css/
│   │   │           │   ├── styles.css
│   │   │           │   └── respond.css
│   │   │           └── js/
│   │   │               ├── api.js                      # API 통신 모듈
│   │   │               ├── app.js                      # 관리자 페이지 로직
│   │   │               └── respond.js                  # 응답자 페이지 로직
│   │   └── test/
│   │       └── java/com/survey/
│   │           ├── controller/                         # Controller 단위 테스트
│   │           └── service/                            # Service 단위 테스트
│   └── build.gradle
└── docs/
```

## 도메인 모델

```
Form (설문 폼)
 ├── Section[] (섹션 - 질문 그룹, orderIndex 순 정렬)
 │    └── Question[] (질문)
 ├── Question[] (섹션 없는 질문, orderIndex 순 정렬)
 └── Response[] (응답)
      ├── Answer[] (질문별 답변)
      └── FileMetadata[] (첨부파일 메타데이터)

Question
 ├── type: 질문 타입 (text, radio, checkbox 등)
 ├── required: 필수 여부
 ├── orderIndex: 정렬 순서
 ├── config (JSON): 타입별 추가 설정 (선택지 목록 등)
 └── attachment: 첨부파일 (filename, storedName, contentType)

Response
 ├── email: 응답자 이메일
 ├── submittedAt: 제출 시각
 └── Answer[]
      ├── questionId
      └── value (JSON): 응답 값
```

## API 엔드포인트

### 폼 관리 (`/api/forms`)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/forms` | 폼 생성 |
| GET | `/api/forms` | 전체 폼 목록 조회 |
| GET | `/api/forms/{id}` | 폼 단건 조회 |
| PUT | `/api/forms/{id}` | 폼 수정 |
| DELETE | `/api/forms/{id}` | 폼 삭제 |
| GET | `/api/forms/{id}/public` | 응답자용 공개 폼 조회 (질문 orderIndex 순 반환) |

**폼 생성/수정 Request Body**
```json
{
  "title": "설문 제목",
  "description": "설명",
  "settings": {},
  "sections": [],
  "questions": []
}
```

---

### 질문 관리 (`/api/forms/{formId}/questions`)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/forms/{formId}/questions` | 질문 추가 |
| GET | `/api/forms/{formId}/questions/{questionId}` | 질문 조회 |
| PUT | `/api/forms/{formId}/questions/{questionId}` | 질문 수정 |
| DELETE | `/api/forms/{formId}/questions/{questionId}` | 질문 삭제 |
| PUT | `/api/forms/{formId}/questions/reorder` | 질문 순서 변경 |
| POST | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 업로드 |
| GET | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 다운로드 |
| DELETE | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 삭제 |

**질문 생성 Request Body**
```json
{
  "type": "radio",
  "title": "좋아하는 색은?",
  "description": "하나만 선택하세요",
  "required": true,
  "orderIndex": 1,
  "config": {
    "options": ["빨강", "파랑", "초록"]
  }
}
```

> 첨부파일 업로드는 `multipart/form-data` 형식으로 `file` 파라미터 사용.
> 파일 크기 제한: **10MB**

---

### 섹션 관리 (`/api/forms/{formId}/sections`)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/forms/{formId}/sections` | 섹션 생성 |
| GET | `/api/forms/{formId}/sections` | 섹션 목록 조회 |
| GET | `/api/forms/{formId}/sections/{sectionId}` | 섹션 조회 |
| PUT | `/api/forms/{formId}/sections/{sectionId}` | 섹션 수정 |
| DELETE | `/api/forms/{formId}/sections/{sectionId}` | 섹션 삭제 |

**섹션 생성 Request Body**
```json
{
  "title": "섹션 제목",
  "description": "섹션 설명",
  "orderIndex": 1
}
```

---

### 응답 관리 (`/api/forms/{formId}/responses`)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/forms/{formId}/responses` | 응답 제출 |
| GET | `/api/forms/{formId}/responses` | 응답 목록 조회 |
| GET | `/api/forms/{formId}/responses/{responseId}` | 응답 단건 조회 |
| PUT | `/api/forms/{formId}/responses/{responseId}` | 응답 수정 |

**응답 제출 Request Body**
```json
{
  "email": "user@example.com",
  "answers": [
    {
      "questionId": 1,
      "value": "빨강"
    },
    {
      "questionId": 2,
      "value": ["옵션A", "옵션B"]
    }
  ]
}
```

---

### 관리자

| Method | URL | 설명 |
|--------|-----|------|
| DELETE | `/api/admin/reset` | DB 전체 초기화 (개발 전용) |

---

## 환경 설정

`backend/.env` 파일을 생성하고 아래 값을 설정합니다.

```env
DB_URL=your_url_here
DB_USERNAME=your_username_here
DB_PASSWORD=your_password_here
```

`application.yml` 설정

```yaml
server:
  port: 8080

file:
  upload:
    dir: uploads       # 파일 저장 경로 (프로젝트 루트 기준)
    max-size: 10485760 # 10MB
```

## 실행 방법

**사전 요구사항**
- Java 17
- MySQL 데이터베이스 생성

**테스트 실행**

```bash
cd backend
./gradlew test
```

> 테스트는 H2 인메모리 DB를 사용하므로 별도 DB 설정이 필요 없습니다.
