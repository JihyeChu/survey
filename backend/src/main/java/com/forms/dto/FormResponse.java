package com.forms.dto;

import com.forms.entity.Form;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

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
    private List<QuestionResponse> questions;

    public static FormResponse fromEntity(Form form) {
        return FormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .settings(form.getSettings())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .build();
    }

}
