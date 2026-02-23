# Survey

설문 제작 도구를 직접 만들어보고 싶어서 시작한 프로젝트입니다. 외부 라이브러리 없이 순수 HTML/CSS/JS로 프론트를 구성하고, 백엔드는 Spring Boot + MySQL로 만들었습니다.

설문 제작부터 응답 수집, 결과 확인까지 핵심 흐름을 최대한 구현하는 게 목표였습니다.

---

## 기술 스택

| 구분 | 사용 기술 |
|------|-----------|
| Frontend | HTML, CSS, JavaScript (프레임워크 없음) |
| Backend | Java 17, Spring Boot 3.x, Spring Data JPA |
| Database | MySQL |
| Build | Gradle |
| Test | JUnit 5, H2 (인메모리 DB) |

---

## 실행 방법

### 사전 준비

- Java 17 이상
- MySQL 8.0 이상


### 환경변수 설정

`backend/.env.example`을 복사해서 `.env` 파일을 만들고 DB 접속 정보를 채워줍니다.

```bash
cp backend/.env.example backend/.env
```

```env
DB_URL=your_url_here
DB_USERNAME=your_id_here
DB_PASSWORD=your_password_here
```

## 프로젝트 구조

```
google-form-clone/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/forms/
│   │   │   │   ├── controller/      # REST API 엔드포인트
│   │   │   │   ├── service/         # 비즈니스 로직
│   │   │   │   ├── repository/      # JPA Repository
│   │   │   │   ├── entity/          # DB 엔티티
│   │   │   │   ├── dto/             # Request/Response DTO
│   │   │   │   └── exception/       # 전역 예외 처리
│   │   │   └── resources/
│   │   │       ├── static/
│   │   │       │   ├── js/
│   │   │       │   │   ├── app.js       # 설문 제작(Builder) 전체 로직
│   │   │       │   │   ├── api.js       # 서버 API 통신 / 게시 관리
│   │   │       │   │   └── respond.js   # 응답자 화면 로직
│   │   │       │   └── css/
│   │   │       ├── templates/           # Thymeleaf (index.html, respond.html)
│   │   │       └── application.yml
│   │   └── test/
│   │       └── java/com/forms/         # 단위 테스트 (69개)
│   ├── uploads/                        # 업로드된 첨부파일 저장 경로
│   └── build.gradle
└── prompts/                            # 기능 설계 스펙 문서
```

---

## 주요 기능

### 설문 제작 (Builder)

설문을 만드는 화면입니다. 질문을 추가하고 순서를 바꾸는 것까지 전부 `app.js` 한 파일에서 관리합니다. 상태는 localStorage에 자동저장되기 때문에 브라우저를 닫았다 열어도 작업 내용이 유지됩니다.

**지원하는 질문 유형**

- 단답형
- 장문형
- 객관식 (단일 선택)
- 체크박스 (다중 선택)
- 드롭다운
- 선형 배율 (1~5, 1~10 등)
- 날짜
- 파일 업로드

각 질문에 이미지나 문서 파일을 첨부할 수도 있습니다. 단, 이 기능은 설문을 게시하기 전(임시저장 상태)에만 동작하고, 게시 이후에는 첨부파일 추가/변경이 불가합니다.

**섹션 기능**

질문 그룹을 나눠서 여러 페이지처럼 구성할 수 있습니다. 응답자는 섹션 단위로 페이지를 넘겨가며 응답하게 됩니다.

**질문 순서 변경**

드래그 앤 드롭으로 질문 순서를 바꿀 수 있습니다. 섹션 간 이동도 됩니다.

### 저장 방식

두 가지 상태가 있습니다.

- **임시저장 (Draft)**: 설문 제작 중 변경사항은 즉시 localStorage에 자동저장됩니다. 게시 전까지 서버에는 아무것도 저장되지 않습니다.
- **게시됨 (Published)**: "게시" 버튼을 누르면 그 순간 서버(MySQL)에 저장되고 응답 링크가 활성화됩니다. 이후 수정하면 "수정됨" 상태로 표시되고, 다시 게시해야 서버에 반영됩니다.

임시저장 중에 이미지 첨부파일을 올리는 경우, 파일이 base64로 변환되어 localStorage에 함께 저장됩니다. localStorage 용량 한계 때문에 **임시저장 중 첨부파일은 1MB 이하만** 가능합니다. 게시 이후에는 파일이 서버로 직접 업로드되므로 최대 10MB까지 가능합니다.

### 설문 설정

- **이메일 수집**: 응답자 이메일 주소 수집 여부
- **응답 수정 허용**: 제출 후 응답자가 답변을 수정할 수 있도록 허용
- **진행 바 표시**: 응답 화면 상단에 진행률 표시

### 응답 수집

설문을 게시하면 `/respond?id={formId}` 링크로 응답자가 접근할 수 있습니다. 응답 결과는 관리자 화면의 "응답" 탭에서 확인할 수 있습니다.

---

## API 엔드포인트

### 설문 (Form)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/forms` | 설문 생성 |
| `GET` | `/api/forms` | 전체 설문 목록 조회 |
| `GET` | `/api/forms/{id}` | 특정 설문 조회 |
| `PUT` | `/api/forms/{id}` | 설문 수정 |
| `DELETE` | `/api/forms/{id}` | 설문 삭제 |

### 질문 (Question)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/forms/{formId}/questions` | 질문 추가 |
| `GET` | `/api/forms/{formId}/questions/{questionId}` | 질문 조회 |
| `PUT` | `/api/forms/{formId}/questions/{questionId}` | 질문 수정 |
| `DELETE` | `/api/forms/{formId}/questions/{questionId}` | 질문 삭제 |
| `PUT` | `/api/forms/{formId}/questions/reorder` | 질문 순서 변경 |

### 질문 첨부파일

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 업로드 |
| `GET` | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 다운로드 |
| `DELETE` | `/api/forms/{formId}/questions/{questionId}/attachment` | 첨부파일 삭제 |

### 섹션 (Section)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/forms/{formId}/sections` | 섹션 생성 |
| `GET` | `/api/forms/{formId}/sections` | 섹션 목록 조회 |
| `PUT` | `/api/forms/{formId}/sections/{sectionId}` | 섹션 수정 |
| `DELETE` | `/api/forms/{formId}/sections/{sectionId}` | 섹션 삭제 |

### 응답 (Response)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/forms/{formId}/responses` | 응답 제출 |
| `GET` | `/api/forms/{formId}/responses` | 응답 목록 조회 |
| `GET` | `/api/forms/{formId}/responses/{responseId}` | 특정 응답 조회 |
| `PUT` | `/api/forms/{formId}/responses/{responseId}` | 응답 수정 |

### 응답자 공개 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/public/forms/{id}` | 응답자용 설문 조회 (질문 포함) |

---

## 파일 업로드

업로드된 파일은 `backend/uploads/` 디렉터리에 저장됩니다. 파일명은 원본명_타임스탬프_랜덤UUID 형태로 중복을 방지합니다.

설정값은 `application.yml`에서 변경할 수 있습니다.

```yaml
file:
  upload:
    dir: uploads
    max-size: 10485760   # 10MB
```

지원 파일 형식: 이미지(jpg, jpeg, png, gif, webp), PDF, Word, Excel, PowerPoint

---

## 테스트

```bash
cd backend
./gradlew test
```

H2 인메모리 DB를 사용하기 때문에 MySQL 없이도 테스트가 돌아갑니다. 현재 Controller 테스트 3개, Service 테스트 4개, 총 69개 테스트가 있습니다.

---

## 알려진 제한사항

- 인증/로그인 기능이 없습니다. 누구나 설문을 만들고 결과를 볼 수 있습니다.
- 파일은 로컬 디스크에 저장됩니다. 서버를 재배포하거나 이전하면 기존 첨부파일이 날아갑니다.
- 임시저장 중 첨부파일은 1MB 제한이 있습니다 (localStorage 용량 제약).
- 응답 파일 업로드 기능(`파일 업로드` 질문 유형)은 UI 구성만 있고 실제 서버 저장 로직은 아직 미구현입니다.
