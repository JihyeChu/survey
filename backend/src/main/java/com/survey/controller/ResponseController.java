package com.survey.controller;

import com.survey.dto.ResponseDto;
import com.survey.dto.ResponseRequest;
import com.survey.service.ResponseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 응답 제출 컨트롤러
 * 응답자가 설문 응답을 제출하고 관리자가 응답을 조회한다.
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ResponseController {

    private final ResponseService responseService;

    /**
     * 응답 제출 API
     * POST /api/forms/{formId}/responses
     *
     * 응답자가 특정 폼에 대한 응답을 제출한다.
     *
     * @param formId 응답할 폼 ID
     * @param request 답변 정보 (questionId와 value 포함)
     * @return 제출된 응답 정보
     */
    @PostMapping("/forms/{formId}/responses")
    public ResponseEntity<ResponseDto> submitResponse(
            @PathVariable Long formId,
            @RequestBody ResponseRequest request) {
        log.info("Received response submission for formId: {}", formId);
        ResponseDto response = responseService.submitResponse(formId, request);
        log.info("Response submitted successfully with id: {}", response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 폼별 응답 조회 API
     * GET /api/forms/{formId}/responses
     *
     * 특정 폼에 제출된 모든 응답을 조회한다.
     * (관리자 권한 필요 - 추후 권한 검증 추가)
     *
     * @param formId 조회할 폼 ID
     * @return 해당 폼의 모든 응답 목록
     */
    @GetMapping("/forms/{formId}/responses")
    public ResponseEntity<List<ResponseDto>> getFormResponses(@PathVariable Long formId) {
        log.info("Fetching responses for formId: {}", formId);
        List<ResponseDto> responses = responseService.getResponsesByFormId(formId);
        log.info("Found {} responses for formId: {}", responses.size(), formId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 특정 응답 조회 API
     * GET /api/forms/{formId}/responses/{responseId}
     *
     * 응답자가 수정하기 위해 기존 응답 정보를 불러온다.
     *
     * @param formId 폼 ID
     * @param responseId 조회할 응답 ID
     * @return 응답 정보
     */
    @GetMapping("/forms/{formId}/responses/{responseId}")
    public ResponseEntity<ResponseDto> getResponse(
            @PathVariable Long formId,
            @PathVariable Long responseId) {
        log.info("Fetching response {} for formId: {}", responseId, formId);
        ResponseDto response = responseService.getResponseByIdAndFormId(formId, responseId);
        log.info("Response {} fetched successfully", responseId);
        return ResponseEntity.ok(response);
    }

    /**
     * 응답 수정 API
     * PUT /api/forms/{formId}/responses/{responseId}
     *
     * 응답자가 제출한 응답을 수정한다.
     * (응답 수정 허용 설정이 활성화된 경우에만 수정 가능)
     *
     * @param formId 폼 ID
     * @param responseId 수정할 응답 ID
     * @param request 수정할 응답 정보
     * @return 수정된 응답 정보
     */
    @PutMapping("/forms/{formId}/responses/{responseId}")
    public ResponseEntity<ResponseDto> updateResponse(
            @PathVariable Long formId,
            @PathVariable Long responseId,
            @RequestBody ResponseRequest request) {
        log.info("Updating response {} for formId: {}", responseId, formId);
        try {
            ResponseDto response = responseService.updateResponse(formId, responseId, request);
            log.info("Response {} updated successfully", responseId);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            log.warn("Response edit not allowed for formId: {}", formId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (IllegalArgumentException e) {
            log.error("Error updating response: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
