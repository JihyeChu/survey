package com.forms.controller;

import com.forms.dto.PublicFormResponse;
import com.forms.service.PublicFormService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 응답자용 공개 폼 조회 컨트롤러
 * 로그인 없이 설문에 참여하는 응답자가 사용하는 엔드포인트를 제공한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class PublicFormController {

    private final PublicFormService publicFormService;

    /**
     * 공개 폼 조회 API
     * GET /api/forms/{formId}/public
     *
     * 응답자가 특정 폼을 조회한다.
     * 폼 제목, 설명, 질문 목록이 orderIndex 순서로 반환된다.
     *
     * @param formId 조회할 폼 ID
     * @return 응답자용 공개 폼 정보
     */
    @GetMapping("/{formId}/public")
    public ResponseEntity<PublicFormResponse> getPublicForm(@PathVariable Long formId) {
        log.info("Received public form request for formId: {}", formId);
        PublicFormResponse response = publicFormService.getPublicForm(formId);
        return ResponseEntity.ok(response);
    }
}
