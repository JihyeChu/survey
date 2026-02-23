package com.survey.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 질문 순서 변경 요청 DTO
 * 질문들의 새로운 순서(orderIndex)를 받아서 저장한다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReorderQuestionsRequest {

    /**
     * 질문 ID와 새로운 order를 매핑한 객체 리스트
     */
    private List<QuestionOrder> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionOrder {
        private Long id;
        private Integer order;
        /** 섹션 간 이동 시 새로운 sectionId (null이면 루트로 이동) */
        private Long sectionId;
    }
}
