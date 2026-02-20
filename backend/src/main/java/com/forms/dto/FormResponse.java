package com.forms.dto;

import com.forms.entity.Form;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormResponse {

    private Long id;
    private String title;
    private String description;
    private String settings;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionResponse> sections;
    private List<QuestionResponse> questions;

    public static FormResponse fromEntity(Form form) {
        List<SectionResponse> sectionResponses = form.getSections() != null
                ? form.getSections().stream()
                    .sorted(Comparator.comparingInt(s -> s.getOrderIndex() != null ? s.getOrderIndex() : 0))
                    .map(SectionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        List<QuestionResponse> questionResponses = form.getQuestions() != null
                ? form.getQuestions().stream()
                    .sorted(Comparator.comparingInt(q -> q.getOrderIndex() != null ? q.getOrderIndex() : 0))
                    .map(QuestionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return FormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .settings(form.getSettings())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .sections(sectionResponses)
                .questions(questionResponses)
                .build();
    }

}
