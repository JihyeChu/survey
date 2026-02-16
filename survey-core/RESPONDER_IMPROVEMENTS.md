# SurveyCore Responder 개선 사항

**변경 일시**: 2026-02-16
**개선 대상**: `initResponder` 함수
**상태**: ✅ 완료

---

## 개선 사항 요약

### 1. HIGH: onFileUpload 콜백에 config 인자 추가

**변경 위치**: 1789~1791줄

**이전 코드**:
```javascript
const uploadedMetadata = await config.onFileUpload(question.id, answerValue.files);
```

**개선 코드**:
```javascript
const uploadedMetadata = await config.onFileUpload(
    question.id,
    answerValue.files,
    question.config || {}  // ← config 인자 추가
);
```

**개선 이유**:
- 호스트 애플리케이션이 파일 설정(최대 크기, 허용 타입 등)에 접근 가능
- 서버 측 파일 검증에 필요한 메타데이터 제공
- API 계약 명확화

**사용 예**:
```javascript
onFileUpload: async (questionId, files, config) => {
    const maxFileSize = config.maxFileSize || 10 * 1024 * 1024;
    const allowedExtensions = config.allowedExtensions || [];

    // 클라이언트 측 재검증
    for (const file of files) {
        if (file.size > maxFileSize) {
            throw new Error(`파일 크기 초과: ${file.name}`);
        }
    }

    // 서버에 업로드
    const formData = new FormData();
    files.forEach(file => formData.append('file', file));

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    return await response.json();
}
```

---

### 2. MEDIUM: readOnly 모드 전체 구현

**변경 위치**: 여러 곳

#### 2.1 이메일 필드 (1317~1348줄)

**개선 내용**:
- disabled 속성 추가
- 이벤트 리스너 조건부 등록

```javascript
input type="email"
  ...
  ${config.readOnly ? 'disabled' : ''}>  // ← disabled 추가
```

#### 2.2 텍스트 입력 (1423~1444줄)

```javascript
if (config.readOnly) {
    input.disabled = true;
} else {
    input.addEventListener('input', (e) => {
        // 입력 처리
    });
}
```

#### 2.3 텍스트영역 (1453~1474줄)

```javascript
if (config.readOnly) {
    textarea.disabled = true;
} else {
    textarea.addEventListener('input', (e) => {
        // 입력 처리
    });
}
```

#### 2.4 라디오 버튼 (1491~1525줄)

```javascript
${config.readOnly ? 'disabled' : ''}  // ← disabled 속성

if (!config.readOnly) {
    input.addEventListener('change', (e) => {
        // 변경 처리
    });
}
```

#### 2.5 체크박스 (1530~1567줄)

```javascript
${config.readOnly ? 'disabled' : ''}  // ← disabled 속성

if (!config.readOnly) {
    input.addEventListener('change', () => {
        // 변경 처리
    });
}
```

#### 2.6 드롭다운 (1572~1601줄)

```javascript
if (config.readOnly) {
    select.disabled = true;
}

if (!config.readOnly) {
    select.addEventListener('change', (e) => {
        // 변경 처리
    });
}
```

#### 2.7 파일 업로드 (1606~1668줄)

```javascript
if (config.readOnly) {
    input.disabled = true;
}

if (!config.readOnly) {
    input.addEventListener('change', (e) => {
        // 파일 처리
    });
}
```

#### 2.8 선형 배율 (1673~1715줄)

```javascript
if (config.readOnly) {
    button.disabled = true;
} else {
    button.addEventListener('click', () => {
        // 선택 처리
    });
}
```

#### 2.9 날짜 입력 (1720~1738줄)

```javascript
if (config.readOnly) {
    input.disabled = true;
} else {
    input.addEventListener('change', (e) => {
        // 변경 처리
    });
}
```

#### 2.10 제출 버튼 영역 (1305~1314줄)

**개선 전**:
```javascript
if (!config.readOnly) {
    formContainer.appendChild(renderSubmitButton());
}
```

**개선 후**:
```javascript
if (!config.readOnly) {
    formContainer.appendChild(renderSubmitButton());
} else {
    // readOnly 모드 안내
    const notice = document.createElement('div');
    notice.className = 'survey-readonly-notice';
    notice.innerHTML = '<p>응답 보기 모드</p>';
    formContainer.appendChild(notice);
}
```

**readOnly 모드 사용 예**:
```javascript
// 응답 검토 화면
const responder = SurveyCore.initResponder('#survey-container', {
    form: formData,
    readOnly: true  // ← 보기 전용 모드 활성화
});
```

---

## 변경 영향도 분석

### 호환성
- ✅ 하위 호환성 유지 (기존 코드 정상 작동)
- ✅ 새로운 인자는 선택사항

### 성능
- ✅ 성능 영향 없음
- ✅ readOnly 모드에서 이벤트 리스너 덜 생성

### 보안
- ✅ disabled 속성 추가로 접근 제어 강화
- ✅ 호스트가 서버 검증 책임

### 테스트 필요 항목

```javascript
// 1. readOnly 모드 테스트
const responder = SurveyCore.initResponder('#survey', {
    form: form,
    readOnly: true
});
// 모든 입력 필드 disabled 확인
// 제출 버튼 표시 안 됨 확인
// onChange 콜백 호출 안 됨 확인

// 2. config 인자 전달 테스트
const responder = SurveyCore.initResponder('#survey', {
    form: form,
    onFileUpload: async (questionId, files, config) => {
        console.assert(config !== undefined, 'config 전달됨');
        console.assert(config.maxFileSize !== undefined, 'maxFileSize 포함');
        return [];
    }
});
```

---

## 마이그레이션 가이드

### 기존 코드 호환성
**문제 없음** - 기존 코드는 모두 정상 작동합니다.

```javascript
// 이전 코드도 여전히 작동
const responder = SurveyCore.initResponder('#survey', {
    form: form,
    onSubmit: async (response) => {
        // 제출 처리
    }
});
```

### 새로운 기능 활용

#### 1. readOnly 모드 활용
```javascript
// 응답 검토 화면
const responder = SurveyCore.initResponder('#review-container', {
    form: form,
    response: existingResponse,  // 기존 응답 로드
    readOnly: true               // 보기 전용 모드
});
```

#### 2. 파일 config 활용
```javascript
const responder = SurveyCore.initResponder('#survey', {
    form: form,
    onFileUpload: async (questionId, files, config) => {
        // config 활용
        const extensions = config.allowedExtensions || [];
        const maxSize = config.maxFileSize || 10 * 1024 * 1024;

        // 검증 및 업로드
        for (const file of files) {
            validateFile(file, extensions, maxSize);
        }

        return await uploadToServer(files);
    }
});
```

---

## 향후 개선 계획 (선택사항)

### 제안 1: 진행률 콜백
```javascript
onProgress: (questionId, percentage) => {
    // 파일 업로드 진행률 표시
}
```

### 제안 2: 조건부 질문
```javascript
question: {
    conditions: [
        {
            questionId: 'q-1',
            operator: 'equals',
            value: 'yes'
        }
    ]
}
```

### 제안 3: 필드 레벨 검증
```javascript
onFieldValidation: (questionId, value) => {
    // 사용자 정의 검증
    return { valid: true, error: null };
}
```

---

## 테스트 체크리스트

- [ ] readOnly 모드 - 이메일 필드 disabled
- [ ] readOnly 모드 - 텍스트 입력 disabled
- [ ] readOnly 모드 - 텍스트영역 disabled
- [ ] readOnly 모드 - 라디오 버튼 disabled
- [ ] readOnly 모드 - 체크박스 disabled
- [ ] readOnly 모드 - 드롭다운 disabled
- [ ] readOnly 모드 - 파일 업로드 disabled
- [ ] readOnly 모드 - 선형 배율 disabled
- [ ] readOnly 모드 - 날짜 입력 disabled
- [ ] readOnly 모드 - 제출 버튼 미표시
- [ ] readOnly 모드 - onChange 콜백 미호출
- [ ] onFileUpload - config 인자 전달 확인
- [ ] onFileUpload - maxFileSize 접근 가능 확인
- [ ] onFileUpload - allowedExtensions 접근 가능 확인
- [ ] 하위 호환성 - 기존 코드 정상 작동
- [ ] 하위 호환성 - config 없이도 동작

---

**개선 완료**: 2026-02-16 ✅
