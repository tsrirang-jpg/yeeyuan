package com.yeeyuan;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.yeeyuan.Db.*;
@Service
public class MenuService {
 final Db db;public MenuService(Db db){this.db=db;}
 public Map<String,Object> menu(){List<Map<String,Object>> products=new ArrayList<>();for(var p:db.jdbc.queryForList("SELECT p.* FROM product p JOIN category c ON c.id=p.category_id WHERE c.active=true ORDER BY p.name")){List<Map<String,Object>> groups=new ArrayList<>();for(var g:db.jdbc.queryForList("SELECT g.* FROM option_group g JOIN product_option_group pg ON pg.group_id=g.id WHERE pg.product_id=? ORDER BY g.name",uuid(p,"id"))){List<Map<String,Object>> choices=db.jdbc.queryForList("SELECT id,label,price_delta_satang,active FROM option_choice WHERE group_id=? ORDER BY price_delta_satang,label",uuid(g,"id")).stream().map(c->Map.<String,Object>of("id",c.get("id"),"label",c.get("label"),"priceDeltaSatang",c.get("price_delta_satang"),"active",c.get("active"))).toList();groups.add(Map.of("id",g.get("id"),"name",g.get("name"),"minSelect",g.get("min_select"),"maxSelect",g.get("max_select"),"choices",choices));}products.add(Map.of("id",p.get("id"),"categoryId",p.get("category_id"),"name",p.get("name"),"description",str(p,"description"),"priceSatang",p.get("price_satang"),"station",p.get("station"),"active",p.get("active"),"soldOut",p.get("sold_out"),"optionGroups",groups,"version",p.get("version")));}return Map.of("catalogVersion",db.one("SELECT catalog_version FROM store LIMIT 1").get("catalog_version"),"categories",db.jdbc.queryForList("SELECT id,name FROM category WHERE active=true ORDER BY sort_order"),"products",products);}
 public Map<String,Object> store(Settings config){var s=db.one("SELECT * FROM store LIMIT 1");return Map.of("name",s.get("name"),"acceptingOrders",s.get("accepting_orders"),"packagingFeeSatang",s.get("packaging_fee_satang"),"paymentMode",config.mockPayments()?"MOCK":"OMISE");}
}
