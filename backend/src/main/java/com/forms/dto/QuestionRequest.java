package com.forms.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionRequest {

    private Long id; // 기존 질문 업데이트 시 사용
    private String type;
    private String title;
    private String description;
    private Boolean required;
    private Integer orderIndex;
    private JsonNode config;
    // Attachment 정보 (수정 시 기존 첨부파일 유지)
    private String attachmentFilename;
    private String attachmentStoredName;
    private String attachmentContentType;
}
