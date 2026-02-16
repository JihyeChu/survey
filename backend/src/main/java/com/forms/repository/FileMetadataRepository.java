package com.forms.repository;

import com.forms.entity.FileMetadata;
import com.forms.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByResponse(Response response);

    List<FileMetadata> findByResponseId(Long responseId);

    List<FileMetadata> findByQuestionId(Long questionId);

    List<FileMetadata> findByResponseIdAndQuestionId(Long responseId, Long questionId);

    List<FileMetadata> findByTempQuestionId(String tempQuestionId);
}
