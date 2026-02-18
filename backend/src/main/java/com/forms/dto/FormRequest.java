package com.forms.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormRequest {

    private String title;
    private String description;
    private JsonNode settings;
    private List<SectionRequest> sections;
    private List<QuestionRequest> questions;

}
