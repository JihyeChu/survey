package com.forms.dto;

import com.forms.entity.Answer;
import com.forms.entity.Response;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResponseDto {

    private Long id;
    private Long formId;
    private String email;
    private LocalDateTime submittedAt;
    private List<AnswerDto> answers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerDto {
        private Long id;
        private Long questionId;
        private String value;

        public static AnswerDto fromEntity(Answer answer) {
            return AnswerDto.builder()
                    .id(answer.getId())
                    .questionId(answer.getQuestionId())
                    .value(answer.getValue())
                    .build();
        }
    }

    public static ResponseDto fromEntity(Response response) {
        return ResponseDto.builder()
                .id(response.getId())
                .formId(response.getForm().getId())
                .email(response.getEmail())
                .submittedAt(response.getSubmittedAt())
                .answers(response.getAnswers().stream()
                        .map(AnswerDto::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
}
