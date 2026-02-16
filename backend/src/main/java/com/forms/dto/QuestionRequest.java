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

    private String type;
    private String title;
    private String description;
    private Boolean required;
    private Integer orderIndex;
    private JsonNode config;
}
