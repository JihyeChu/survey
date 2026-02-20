package com.forms.dto;

import com.forms.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 응답자용 공개 질문 DTO
 * 응답자는 질문 내용, 필수 여부, 타입 등의 필수 정보만 조회한다.
 * Question의 attachment 정보도 포함되어 응답 화면에서 질문 이미지를 표시할 수 있다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicQuestionResponse {

    private Long id;
    private String type;
    private String title;
    private String description;
    private Boolean required;
    private Integer orderIndex;
    private String config;
    // Question Attachment fields (single file per question)
    private String attachmentFilename;
    private String attachmentStoredName;
    private String attachmentContentType;

    public static PublicQuestionResponse fromEntity(Question question) {
        return PublicQuestionResponse.builder()
                .id(question.getId())
                .type(question.getType())
                .title(question.getTitle())
                .description(question.getDescription())
                .required(question.getRequired())
                .orderIndex(question.getOrderIndex())
                .config(question.getConfig())
                .attachmentFilename(question.getAttachmentFilename())
                .attachmentStoredName(question.getAttachmentStoredName())
                .attachmentContentType(question.getAttachmentContentType())
                .build();
    }
}
