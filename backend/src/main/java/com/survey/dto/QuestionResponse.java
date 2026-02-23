package com.survey.dto;

import com.survey.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponse {

    private Long id;
    private Long formId;
    private Long sectionId;
    private String type;
    private String title;
    private String description;
    private Boolean required;
    private Integer orderIndex;
    private String config;
    // Question Attachment fields (single file per question)
    private String attachmentFilename;
    private String attachmentStoredName;
    private String attachmentContentType;

    public static QuestionResponse fromEntity(Question question) {
        return QuestionResponse.builder()
                .id(question.getId())
                .formId(question.getForm().getId())
                .sectionId(question.getSection() != null ? question.getSection().getId() : null)
                .type(question.getType())
                .title(question.getTitle())
                .description(question.getDescription())
                .required(question.getRequired())
                .orderIndex(question.getOrderIndex())
                .config(question.getConfig())
                .attachmentFilename(question.getAttachmentFilename())
                .attachmentStoredName(question.getAttachmentStoredName())
                .attachmentContentType(question.getAttachmentContentType())
                .build();
    }
}
