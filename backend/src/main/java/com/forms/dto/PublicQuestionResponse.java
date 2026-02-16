package com.forms.dto;

import com.forms.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 응답자용 공개 질문 DTO
 * 응답자는 질문 내용, 필수 여부, 타입 등의 필수 정보만 조회한다.
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

    public static PublicQuestionResponse fromEntity(Question question) {
        return PublicQuestionResponse.builder()
                .id(question.getId())
                .type(question.getType())
                .title(question.getTitle())
                .description(question.getDescription())
                .required(question.getRequired())
                .orderIndex(question.getOrderIndex())
                .config(question.getConfig())
                .build();
    }
}
