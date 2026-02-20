package com.forms.repository;

import com.forms.entity.Form;
import com.forms.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResponseRepository extends JpaRepository<Response, Long> {
    List<Response> findByForm(Form form);

    @Query("SELECT DISTINCT r FROM Response r LEFT JOIN FETCH r.answers LEFT JOIN FETCH r.files WHERE r.form = :form")
    List<Response> findByFormWithAnswers(@Param("form") Form form);

    @Query("SELECT DISTINCT r FROM Response r LEFT JOIN FETCH r.answers LEFT JOIN FETCH r.files WHERE r.id = :id")
    Response findByIdWithAnswers(@Param("id") Long id);

    List<Response> findByFormId(Long formId);
}
