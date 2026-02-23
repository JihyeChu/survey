package com.survey.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionRequest {

    private String title;
    private String description;
    private Integer orderIndex;
    private List<QuestionRequest> questions;

}
