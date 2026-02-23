package com.survey.dto;

import com.survey.entity.FileMetadata;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadataResponse {

    private Long id;
    private String originalFilename;
    private String storedFilename;
    private Long fileSize;
    private String contentType;
    private Long responseId;
    private Long questionId;
    private String tempFormId;
    private String tempQuestionId;
    private LocalDateTime uploadedAt;

    public static FileMetadataResponse fromEntity(FileMetadata entity) {
        return FileMetadataResponse.builder()
                .id(entity.getId())
                .originalFilename(entity.getOriginalFilename())
                .storedFilename(entity.getStoredFilename())
                .fileSize(entity.getFileSize())
                .contentType(entity.getContentType())
                .responseId(entity.getResponse() != null ? entity.getResponse().getId() : null)
                .questionId(entity.getQuestion() != null ? entity.getQuestion().getId() : null)
                .tempFormId(entity.getTempFormId())
                .tempQuestionId(entity.getTempQuestionId())
                .uploadedAt(entity.getUploadedAt())
                .build();
    }
}
