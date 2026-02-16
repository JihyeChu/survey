package com.forms.repository;

import com.forms.entity.Answer;
import com.forms.entity.Response;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findByResponse(Response response);
}
