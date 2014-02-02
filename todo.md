Develop TODO list
==================

* 빌린 돈 값기, 적금에 관한 account 성격을 입력하고, 이 성격에 따라 데이터를 다룰 수 있어야 한다.
* 카테고리 설계
    - 카테고리는 무조건 2단계로 한다.
    - 카테고리를 추가/삭제할 수 있다.
    - 단, 카테고리 삭제시 해당 카테고리로 들어가 있는 사용내역이 없어야 한다.
    - 이를 위해서 카테고리 일괄 변경 기능이 필요하다.
* 수정 기능 - 수정할 때 통계 내역을 변경해 줘야 한다. 간단할 텐데, 수정은 기본적으로 이체와 같기 때문이다.
* 삭제 기능 - 삭제할 때 통계 내역을 변경해 줘야 한다.
* Category Focus시엔 지금 메모에 입력한 내역 관련해서 가장 많은 카테고리가 맨 위에 올라와야 하지만, 모든 카테고리가 나오기도 해야 한다. 필터링 기능도 필수다.
* 데이터 모두 삭제하면 auto complete record 도 삭제된다. 이걸 삭제 후에 곧바로 재 세팅하지 말고 register 호출할 때 세팅하자.
* memo_related 자동완성 띄울 때 memo blur시 auto_complete_memo_related() 실행해서 데이터를 별로 객체로 세팅한다. (메모를 선택하지 않고 그냥 입력하고 오더라도 렌더링이 돼야 한다.)
* 각 input focus시엔 데이터를 보여 주기만 한다. 자동완성 렌더링은 memeo blur시 이미 돼 있어야 한다.
* 메모를 입력하지 않고 온 경우엔 자동완성을 렌더링하지 않는다. 메모가 입력된 것을 기본으로 한다. 안내한다.
* 필터링은 선언적 방식으로 짜자.
* 통계는 숫자와 그래프를 모두 제공한다.


완료
----

* memo_related 자동완성 선택하면 다음 input으로 이동한다.
* 카테고리 입력시 중복검사
* category/list/withdrawal/식비, category/list/deposit/주수입 식으로 URL 구성해야 한다.
* set_setting 할 때 인자값이 string이 아니면 JSON.stringify 자동으로 하게 하자. -> set_setting_obj 함수 만듦.
* get_setting도 자동으로 JSON.parse 하자. -> get_setting_obj 함수 만듦.
* account 를 일관되게 관리할 수 있어야 한다. 이 기능을 최우선으로 만들자. API 정의 우선 필요.
* 이체는 수입 지출 통계에서 빼야 한다. 이체는 지출이 아니다. 따라서 이체 항목으로 넣어야 한다.
* MMB.category_record, MMB.category 모두 categories로 변경.
* set_category를 init_categories로 변경.
