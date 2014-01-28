Develop TODO list
==================

* 수정 기능
* 삭제 기능
* 데이터 모두 삭제하면 auto complete record 도 삭제된다. 이걸 삭제 후에 곧바로 재 세팅하지 말고 register 호출할 때 세팅하자.
* memo_related 자동완성 띄울 때 memo blur시 auto_complete_memo_related() 실행해서 데이터를 별로 객체로 세팅한다.
* 각 input focus시엔 데이터 필터링하고 렌더링한다.
* memo_related 자동완성 선택하면 다음 input으로 이동한다.