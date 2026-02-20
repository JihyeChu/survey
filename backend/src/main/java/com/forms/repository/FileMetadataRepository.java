package com.forms.repository;

import com.forms.entity.FileMetadata;
import com.forms.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByResponse(Response response);

    List<FileMetadata> findByResponseId(Long responseId);

    List<FileMetadata> findByQuestionId(Long questionId);

    List<FileMetadata> findByResponseIdAndQuestionId(Long responseId, Long questionId);

    List<FileMetadata> findByTempQuestionId(String tempQuestionId);

    /**
     * question 벌크 삭제 전에 호출 필요.
     * @Modifying JPQL은 JPA cascade를 우회하므로 file_metadata를 먼저 삭제해야 FK 제약 위반 방지.
     */
    @Modifying
    @Query("DELETE FROM FileMetadata f WHERE f.question.id IN (SELECT q.id FROM Question q WHERE q.form.id = :formId)")
    void deleteAllByQuestionFormId(@Param("formId") Long formId);
}
