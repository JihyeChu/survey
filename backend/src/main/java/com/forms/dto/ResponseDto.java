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
    private List<FileMetadataDto> files;

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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FileMetadataDto {
        private Long id;
        private String originalFilename;
        private String storedFilename;
        private String contentType;
        private Long fileSize;
        private Long questionId;

        public static FileMetadataDto fromEntity(com.forms.entity.FileMetadata fileMetadata) {
            return FileMetadataDto.builder()
                    .id(fileMetadata.getId())
                    .originalFilename(fileMetadata.getOriginalFilename())
                    .storedFilename(fileMetadata.getStoredFilename())
                    .contentType(fileMetadata.getContentType())
                    .fileSize(fileMetadata.getFileSize())
                    .questionId(fileMetadata.getQuestion() != null ? fileMetadata.getQuestion().getId() : null)
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
                .files(response.getFiles().stream()
                        .map(FileMetadataDto::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
}
